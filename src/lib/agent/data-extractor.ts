/**
 * Data Extractor Module
 *
 * Extracts data from approved sources and ingests into the database.
 * Supports scraping, API calls, and file downloads.
 */

import { createAgentReadClient } from './supabase-admin';
import { getSourceByName } from './known-sources';
import type { AcquisitionRequest, ExtractionResult } from './types';

/**
 * Score acquired data quality
 */
function scoreAcquiredData(
  record: Record<string, unknown>,
  qualityEstimate: string
): number {
  let score = 5; // Base score for auto-acquired

  // Source reputation
  if (qualityEstimate === 'high') score += 2;
  if (qualityEstimate === 'low') score -= 2;

  // Data completeness
  if (record.latitude && record.longitude) score += 1;
  if (record.event_date) score += 1;
  if (typeof record.description === 'string' && record.description.length > 100) score += 1;

  // Verification signals
  if (typeof record.witness_count === 'number' && record.witness_count > 1) score += 1;
  if (record.has_photos || record.has_physical_evidence) score += 1;

  return Math.min(10, Math.max(1, score));
}

/**
 * Check for duplicate records
 */
async function checkDuplicates(
  records: Record<string, unknown>[],
  domain: string
): Promise<{ unique: Record<string, unknown>[]; duplicateCount: number }> {
  const supabase = createAgentReadClient();
  const unique: Record<string, unknown>[] = [];
  let duplicateCount = 0;

  // Get existing records for comparison (using a simple hash)
  const { data: existing } = await supabase
    .from('aletheia_investigations')
    .select('title, event_date, location')
    .eq('investigation_type', domain)
    .limit(10000);

  const existingHashes = new Set(
    (existing || []).map(r =>
      `${r.title?.toLowerCase().substring(0, 50)}|${r.event_date}|${r.location?.toLowerCase().substring(0, 30)}`
    )
  );

  for (const record of records) {
    const hash = `${String(record.title || '').toLowerCase().substring(0, 50)}|${record.event_date}|${String(record.location || '').toLowerCase().substring(0, 30)}`;

    if (existingHashes.has(hash)) {
      duplicateCount++;
    } else {
      existingHashes.add(hash);
      unique.push(record);
    }
  }

  return { unique, duplicateCount };
}

/**
 * Validate a record has required fields
 */
function validateRecord(record: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!record.title && !record.description) {
    errors.push('Missing title or description');
  }

  if (!record.location && !record.latitude) {
    errors.push('Missing location');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Transform extracted data to investigation schema
 */
function transformToInvestigation(
  record: Record<string, unknown>,
  request: AcquisitionRequest
): Record<string, unknown> {
  return {
    title: record.title || `${request.domain} report`,
    description: record.description || record.summary || '',
    investigation_type: request.domain,
    location: record.location || record.city || record.state || null,
    latitude: record.latitude || record.lat || null,
    longitude: record.longitude || record.lng || record.lon || null,
    event_date: record.event_date || record.date || record.occurred || null,
    source_url: record.url || record.source_url || request.source_url,
    acquisition_id: request.id,
    acquired_at: new Date().toISOString(),
    data_tier: 'exploratory',
    triage_status: 'auto_imported',
    triage_score: scoreAcquiredData(record, request.quality_estimate || 'medium'),
    raw_data: record,
  };
}

/**
 * Extract data from BFRO (mock implementation - real would use puppeteer)
 */
async function extractFromBFRO(request: AcquisitionRequest): Promise<Record<string, unknown>[]> {
  // In a real implementation, this would scrape bfro.net
  // For now, return mock data to demonstrate the flow
  console.log(`[EXTRACTOR] Would scrape BFRO from ${request.source_url}`);

  // Mock: return empty array - real implementation would parse HTML
  return [];
}

/**
 * Extract data from NUFORC (mock implementation)
 */
async function extractFromNUFORC(request: AcquisitionRequest): Promise<Record<string, unknown>[]> {
  console.log(`[EXTRACTOR] Would scrape NUFORC from ${request.source_url}`);
  return [];
}

/**
 * Extract data from NDERF (mock implementation)
 */
async function extractFromNDERF(request: AcquisitionRequest): Promise<Record<string, unknown>[]> {
  console.log(`[EXTRACTOR] Would scrape NDERF from ${request.source_url}`);
  return [];
}

/**
 * Extract data from USGS API
 */
async function extractFromUSGS(request: AcquisitionRequest): Promise<Record<string, unknown>[]> {
  try {
    // USGS earthquake API is real and free
    const params = new URLSearchParams({
      format: 'geojson',
      starttime: '2020-01-01',
      endtime: new Date().toISOString().split('T')[0],
      minmagnitude: '4',
      limit: '500',
    });

    const response = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`
    );

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`);
    }

    const data = await response.json();
    const records: Record<string, unknown>[] = [];

    for (const feature of data.features || []) {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [];

      records.push({
        title: props.title || `M${props.mag} Earthquake`,
        description: props.place || '',
        event_date: props.time ? new Date(props.time).toISOString() : null,
        longitude: coords[0],
        latitude: coords[1],
        depth: coords[2],
        magnitude: props.mag,
        location: props.place,
        url: props.url,
      });
    }

    return records;
  } catch (error) {
    console.error('USGS extraction error:', error);
    return [];
  }
}

/**
 * Main extraction function
 */
export async function executeExtraction(
  request: AcquisitionRequest
): Promise<ExtractionResult> {
  const result: ExtractionResult = {
    source_id: request.id || '',
    records_found: 0,
    records_valid: 0,
    records_duplicate: 0,
    records_ingested: 0,
    errors: [],
    sample_records: [],
  };

  try {
    // Determine extraction method based on source
    let rawRecords: Record<string, unknown>[] = [];
    const sourceName = request.source_name.toLowerCase();
    const sourceUrl = request.source_url.toLowerCase();

    if (sourceName.includes('bfro') || sourceUrl.includes('bfro.net')) {
      rawRecords = await extractFromBFRO(request);
    } else if (sourceName.includes('nuforc') || sourceUrl.includes('nuforc.org')) {
      rawRecords = await extractFromNUFORC(request);
    } else if (sourceName.includes('nderf') || sourceUrl.includes('nderf.org')) {
      rawRecords = await extractFromNDERF(request);
    } else if (sourceName.includes('usgs') || sourceUrl.includes('usgs.gov')) {
      rawRecords = await extractFromUSGS(request);
    } else {
      // Generic extraction not supported yet
      result.errors.push(`No extractor available for source: ${request.source_name}`);
      return result;
    }

    result.records_found = rawRecords.length;

    if (rawRecords.length === 0) {
      result.errors.push('No records extracted from source');
      return result;
    }

    // Validate records
    const validRecords: Record<string, unknown>[] = [];
    for (const record of rawRecords) {
      const validation = validateRecord(record);
      if (validation.valid) {
        validRecords.push(record);
      } else {
        result.errors.push(...validation.errors.map(e => `Record validation: ${e}`));
      }
    }
    result.records_valid = validRecords.length;

    // Check for duplicates
    const { unique, duplicateCount } = await checkDuplicates(
      validRecords,
      request.domain || 'unknown'
    );
    result.records_duplicate = duplicateCount;

    // Transform and ingest
    const supabase = createAgentReadClient();
    const toIngest = unique.map(r => transformToInvestigation(r, request));

    if (toIngest.length > 0) {
      // Batch insert
      const batchSize = 100;
      for (let i = 0; i < toIngest.length; i += batchSize) {
        const batch = toIngest.slice(i, i + batchSize);
        const { error } = await supabase
          .from('aletheia_investigations')
          .insert(batch);

        if (error) {
          result.errors.push(`Ingestion error: ${error.message}`);
        } else {
          result.records_ingested += batch.length;
        }
      }
    }

    // Sample records for review
    result.sample_records = toIngest.slice(0, 5);

  } catch (error) {
    result.errors.push(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Get extraction status summary
 */
export function formatExtractionResult(result: ExtractionResult): string {
  const lines = [
    `Records found: ${result.records_found}`,
    `Records valid: ${result.records_valid}`,
    `Duplicates skipped: ${result.records_duplicate}`,
    `Records ingested: ${result.records_ingested}`,
  ];

  if (result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.length}`);
    for (const error of result.errors.slice(0, 3)) {
      lines.push(`  - ${error}`);
    }
  }

  return lines.join('\n');
}
