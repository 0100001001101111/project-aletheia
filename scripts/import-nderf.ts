/**
 * NDERF (Near Death Experience Research Foundation) Data Importer
 *
 * Fetches NDE accounts from https://search.nderf.org/api/experience
 * and imports them into the Aletheia database.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

// Rate limiting - be respectful to NDERF servers
const DELAY_MS = 500; // 500ms between requests
const BATCH_SIZE = 50; // Insert in batches

interface NderfExperience {
  _id?: string;
  alias?: string;
  country?: string;
  language?: string;
  gender?: string;
  age_at_experience?: string;
  experience_date?: string;
  post_date?: string;
  classification?: string;
  narrative?: string;
  experience_description?: string;
  questionnaire?: Record<string, unknown>;
  // Many other fields from the questionnaire
  [key: string]: unknown;
}

interface ParsedNDE {
  sourceId: string;
  title: string;
  description: string;
  eventDate: Date | null;
  rawData: Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    if (year >= 1800 && year <= 2100) {
      return parsed;
    }
  }
  return null;
}

async function fetchNDE(entryNum: number): Promise<NderfExperience | null> {
  try {
    const response = await fetch(
      `https://search.nderf.org/api/experience?ENTRYNUM=${entryNum}`,
      {
        headers: {
          'User-Agent': 'Aletheia-Research/1.0 (academic research)',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`HTTP ${response.status} for ENTRYNUM=${entryNum}`);
      return null;
    }

    const data = await response.json();
    return data as NderfExperience;
  } catch (error) {
    console.error(`Error fetching ENTRYNUM=${entryNum}:`, error);
    return null;
  }
}

function parseNderfRecord(record: NderfExperience, entryNum: number): ParsedNDE {
  const sourceId = record._id || `nderf_${entryNum}`;

  // Build title from alias and classification
  const alias = record.alias || 'Anonymous';
  const classification = record.classification || 'NDE';
  const title = `${alias} - ${classification}`;

  // Get narrative/description
  const description = record.narrative ||
    record.experience_description ||
    (record as Record<string, unknown>).Description as string ||
    '';

  // Parse event date
  const eventDate = parseDate(record.experience_date);

  // Extract key experience elements for rawData
  const rawData: Record<string, unknown> = {
    nderf_id: record._id,
    entry_num: entryNum,
    alias: record.alias,
    country: record.country,
    language: record.language,
    gender: record.gender,
    age_at_experience: record.age_at_experience,
    experience_date: record.experience_date,
    post_date: record.post_date,
    classification: record.classification,
    narrative: description,
  };

  // Include all questionnaire responses
  if (record.questionnaire) {
    rawData.questionnaire = record.questionnaire;
  }

  // Copy over any other fields that might contain useful data
  const skipFields = new Set(['_id', 'alias', 'country', 'language', 'gender',
    'age_at_experience', 'experience_date', 'post_date', 'classification',
    'narrative', 'experience_description', 'Description', 'questionnaire']);

  for (const [key, value] of Object.entries(record)) {
    if (!skipFields.has(key) && value !== null && value !== undefined) {
      rawData[key] = value;
    }
  }

  return {
    sourceId,
    title,
    description: description.slice(0, 10000), // Limit for DB
    eventDate,
    rawData,
  };
}

async function importBatch(records: ParsedNDE[]): Promise<{ added: number; skipped: number; errors: number }> {
  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of records) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('aletheia_investigations')
      .select('id')
      .eq('source_id', record.sourceId)
      .eq('data_source', 'nderf')
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    // Insert new record
    const { error } = await supabase
      .from('aletheia_investigations')
      .insert({
        investigation_type: 'nde',
        title: record.title,
        description: record.description,
        raw_data: record.rawData,
        created_at: record.eventDate?.toISOString() || new Date().toISOString(),
        data_source: 'nderf',
        source_id: record.sourceId,
        imported_at: new Date().toISOString(),
        tier: 'exploratory',
        triage_status: 'pending',
      });

    if (error) {
      console.error(`Insert error for ${record.sourceId}:`, error.message);
      errors++;
    } else {
      added++;
    }
  }

  return { added, skipped, errors };
}

async function findEntryNumRange(): Promise<{ min: number; max: number }> {
  // Start from a known recent entry and work backwards
  // Based on the archive, latest is around 33223
  let max = 33300; // Start a bit higher to catch any new ones
  let min = 1;

  // Find the actual max by probing
  console.log('Finding entry range...');

  // Binary search for max
  let low = 30000;
  let high = 35000;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const result = await fetchNDE(mid);
    await sleep(200);
    if (result) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  max = low;

  console.log(`Entry range: 1 to ${max}`);
  return { min: 1, max };
}

async function main() {
  console.log('=== NDERF Data Importer ===\n');

  // Get command line args
  const args = process.argv.slice(2);
  const startFrom = args.includes('--start')
    ? parseInt(args[args.indexOf('--start') + 1])
    : null;
  const endAt = args.includes('--end')
    ? parseInt(args[args.indexOf('--end') + 1])
    : null;
  const limitArg = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1])
    : null;

  // Find or use specified range
  let min = startFrom || 1;
  let max = endAt || 33300;

  if (!startFrom && !endAt) {
    const range = await findEntryNumRange();
    min = range.min;
    max = range.max;
  }

  console.log(`\nFetching NDEs from ENTRYNUM ${min} to ${max}`);
  if (limitArg) console.log(`Limit: ${limitArg} records`);
  console.log(`Delay: ${DELAY_MS}ms between requests\n`);

  let totalFetched = 0;
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let batch: ParsedNDE[] = [];

  // NDERF entry numbers aren't sequential, so we need to try each one
  for (let entryNum = min; entryNum <= max; entryNum++) {
    if (limitArg && totalFetched >= limitArg) break;

    const record = await fetchNDE(entryNum);

    if (record && record.alias) {
      const parsed = parseNderfRecord(record, entryNum);
      batch.push(parsed);
      totalFetched++;

      if (totalFetched % 10 === 0) {
        process.stdout.write(`\rFetched: ${totalFetched} | Added: ${totalAdded} | Skipped: ${totalSkipped} | Errors: ${totalErrors}`);
      }

      // Process batch when full
      if (batch.length >= BATCH_SIZE) {
        const result = await importBatch(batch);
        totalAdded += result.added;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
        batch = [];
      }
    }

    await sleep(DELAY_MS);
  }

  // Process remaining batch
  if (batch.length > 0) {
    const result = await importBatch(batch);
    totalAdded += result.added;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  console.log('\n\n=== Import Complete ===');
  console.log(`Total fetched: ${totalFetched}`);
  console.log(`Total added: ${totalAdded}`);
  console.log(`Total skipped (duplicates): ${totalSkipped}`);
  console.log(`Total errors: ${totalErrors}`);
}

main().catch(console.error);
