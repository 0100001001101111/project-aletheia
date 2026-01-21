/**
 * Data ingestion service
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getCellId } from '../window-analysis/grid';
import {
  DataSource,
  ParsedInvestigation,
  IngestionResult,
  SyncStatus,
} from './types';
import { parseRecord, validateInvestigation } from './parsers';

const BATCH_SIZE = 100;

/**
 * Create a sync record and return its ID
 */
export async function createSyncRecord(
  supabase: SupabaseClient,
  source: DataSource,
  syncType: 'full' | 'incremental' = 'full'
): Promise<string> {
  const { data, error } = await supabase
    .from('aletheia_data_sync')
    .insert({
      source,
      sync_type: syncType,
      status: 'running',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create sync record: ${error.message}`);
  return data.id;
}

/**
 * Update sync record with results
 */
export async function updateSyncRecord(
  supabase: SupabaseClient,
  syncId: string,
  result: Partial<{
    status: string;
    records_added: number;
    records_updated: number;
    records_skipped: number;
    last_record_date: string;
    total_source_records: number;
    error_message: string;
    sync_metadata: Record<string, unknown>;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('aletheia_data_sync')
    .update(result)
    .eq('id', syncId);

  if (error) throw new Error(`Failed to update sync record: ${error.message}`);
}

/**
 * Check if a record already exists (for deduplication)
 */
async function recordExists(
  supabase: SupabaseClient,
  source: DataSource,
  sourceId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('aletheia_investigations')
    .select('id', { count: 'exact', head: true })
    .eq('data_source', source)
    .eq('source_id', sourceId);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Insert a parsed investigation into the database
 */
async function insertInvestigation(
  supabase: SupabaseClient,
  inv: ParsedInvestigation
): Promise<{ inserted: boolean; error?: string }> {
  // Check for duplicate
  const exists = await recordExists(supabase, inv.dataSource, inv.sourceId);
  if (exists) {
    return { inserted: false };
  }

  // Build the record
  const record: Record<string, unknown> = {
    investigation_type: inv.investigationType,
    title: inv.title,
    description: inv.description,
    raw_data: inv.rawData,
    data_source: inv.dataSource,
    source_id: inv.sourceId,
    imported_at: new Date().toISOString(),
  };

  // Add event date to created_at if available (for backward compatibility with Bigfoot temporal analysis)
  if (inv.eventDate) {
    record.created_at = inv.eventDate.toISOString();
  }

  const { error } = await supabase
    .from('aletheia_investigations')
    .insert(record);

  if (error) {
    return { inserted: false, error: error.message };
  }

  return { inserted: true };
}

/**
 * Ingest records from parsed data
 */
export async function ingestRecords(
  supabase: SupabaseClient,
  records: Record<string, unknown>[],
  source: DataSource,
  syncId: string,
  onProgress?: (processed: number, total: number) => void
): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: true,
    recordsProcessed: 0,
    recordsAdded: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    errors: [],
    syncId,
  };

  let latestDate: Date | null = null;

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    result.recordsProcessed++;

    try {
      // Parse the record
      const parsed = parseRecord(raw, source);
      if (!parsed) {
        result.recordsSkipped++;
        continue;
      }

      // Validate
      const validationErrors = validateInvestigation(parsed);
      if (validationErrors.length > 0) {
        result.errors.push(`Record ${i}: ${validationErrors.join(', ')}`);
        result.recordsSkipped++;
        continue;
      }

      // Insert
      const insertResult = await insertInvestigation(supabase, parsed);
      if (insertResult.inserted) {
        result.recordsAdded++;
        if (parsed.eventDate && (!latestDate || parsed.eventDate > latestDate)) {
          latestDate = parsed.eventDate;
        }
      } else if (insertResult.error) {
        result.errors.push(`Record ${i}: ${insertResult.error}`);
        result.recordsSkipped++;
      } else {
        result.recordsSkipped++; // Duplicate
      }

      // Progress callback
      if (onProgress && i % BATCH_SIZE === 0) {
        onProgress(i, records.length);
      }
    } catch (err) {
      result.errors.push(`Record ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      result.recordsSkipped++;
    }
  }

  // Update sync record
  await updateSyncRecord(supabase, syncId, {
    status: result.errors.length > 0 ? 'partial' : 'success',
    records_added: result.recordsAdded,
    records_updated: result.recordsUpdated,
    records_skipped: result.recordsSkipped,
    last_record_date: latestDate?.toISOString().split('T')[0],
    total_source_records: records.length,
    error_message: result.errors.length > 0 ? result.errors.slice(0, 10).join('\n') : undefined,
  });

  return result;
}

/**
 * Get sync status for all sources
 */
export async function getSyncStatus(
  supabase: SupabaseClient
): Promise<SyncStatus[]> {
  const sources: DataSource[] = ['nuforc', 'bfro', 'haunted_places'];
  const statuses: SyncStatus[] = [];

  for (const source of sources) {
    // Get latest sync
    const { data: sync } = await supabase
      .from('aletheia_data_sync')
      .select('*')
      .eq('source', source)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get record count
    const { count } = await supabase
      .from('aletheia_investigations')
      .select('id', { count: 'exact', head: true })
      .eq('data_source', source);

    statuses.push({
      source,
      lastSyncAt: sync?.last_sync_at ? new Date(sync.last_sync_at) : null,
      lastRecordDate: sync?.last_record_date ? new Date(sync.last_record_date) : null,
      totalRecords: count ?? 0,
      status: sync?.status ?? 'pending',
    });
  }

  return statuses;
}

/**
 * Update grid cells after ingestion
 * This recalculates window indices for affected cells
 */
export async function updateGridAfterIngestion(
  supabase: SupabaseClient,
  resolution: number = 1.0
): Promise<{ cellsUpdated: number }> {
  // This would typically be done by calling the build-grid endpoint
  // or running a background job
  // For now, return a placeholder
  return { cellsUpdated: 0 };
}
