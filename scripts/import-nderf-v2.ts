/**
 * NDERF Importer v2 - Scrapes archive pages first to get valid entry numbers
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

const DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Archive pages from 1998-2025
const ARCHIVE_PAGES = [
  'NDERF_NDEs.html', // Current NDEs
  '2_6_2025.html', '2_1_2025.html',
  '2_6_2024.html', '2_1_2024.html',
  '2_6_2023.html', '2_1_2023.html',
  '2_6_2022.html', '2_1_2022.html',
  '2_6_2021.html', '2_1_2021.html',
  '2_6_2020.html', '2_1_2020.html',
  '2_6_2019.html', '2_1_2019.html',
  '2_6_2018.html', '2_1_2018.html',
  '2_6_2017.html', '2_1_2017.html',
  '2_6_2016.html', '2_1_2016.html',
  '2_6_2015.html', '2_1_2015.html',
  '2_6_2014.html', '2_1_2014.html',
  '2_6_2013.html', '2_1_2013.html',
  '2_6_2012.html', '2_1_2012.html',
  '2_6_2011_2.html', '2_6_2011_1.html', '2_1_2011.html',
  '2_6_2010_2.html', '2_6_2010_1.html', '2_1_2010.html',
  '2_6_2009.html', '2_1_2009.html',
  '2_6_2008.html', '2_1_2008.html',
  '2_6_2007_2.html', '2_6_2007_1.html', '2_1_2007.html',
  '2_6_2006.html', '2_1_2006.html',
  '2_6_2005.html', '2_1_2005.html',
  '2_6_2004.html', '2_1_2004.html',
  '2_2003.html',
  '2_6_2002.html', '2_1_2002.html',
  '2_1998_2001.html',
];

async function fetchArchivePage(page: string): Promise<number[]> {
  const url = `https://www.nderf.org/Archives/${page}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return [];
    const html = await response.text();

    // Extract ENTRYNUM values from URLs
    const matches = html.matchAll(/ENTRYNUM=(\d+)/g);
    const entryNums = new Set<number>();
    for (const match of matches) {
      entryNums.add(parseInt(match[1]));
    }
    return Array.from(entryNums);
  } catch (error) {
    console.error(`Error fetching ${page}:`, error);
    return [];
  }
}

interface NderfExperience {
  _id?: string;
  Ession_ID?: string;
  alias?: string;
  country?: string;
  language?: string;
  gender?: string;
  Age_Group?: string;
  Experience_Date?: string;
  experience_date?: string;
  Post_Date?: string;
  Classification?: string;
  Description?: string;
  narrative?: string;
  [key: string]: unknown;
}

async function fetchNDE(entryNum: number): Promise<NderfExperience | null> {
  try {
    const response = await fetch(
      `https://search.nderf.org/api/experience?ENTRYNUM=${entryNum}`,
      {
        headers: {
          'User-Agent': 'Aletheia-Research/1.0',
          'Accept': 'application/json',
        },
      }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    if (year >= 1800 && year <= 2100) return parsed;
  }
  return null;
}

async function importNDE(record: NderfExperience, entryNum: number): Promise<'added' | 'skipped' | 'error'> {
  const sourceId = record._id || record.Session_ID || `nderf_${entryNum}`;

  // Check if exists
  const { data: existing } = await supabase
    .from('aletheia_investigations')
    .select('id')
    .eq('source_id', sourceId)
    .eq('data_source', 'nderf')
    .single();

  if (existing) return 'skipped';

  const alias = record.alias || 'Anonymous';
  const classification = record.Classification || 'NDE';
  const title = `${alias} - ${classification}`;
  const description = record.Description || record.narrative || '';
  const eventDate = parseDate(record.Experience_Date || record.experience_date);

  const rawData: Record<string, unknown> = { ...record, entry_num: entryNum };

  const { error } = await supabase
    .from('aletheia_investigations')
    .insert({
      investigation_type: 'nde',
      title,
      description: description.slice(0, 50000),
      raw_data: rawData,
      created_at: eventDate?.toISOString() || new Date().toISOString(),
      data_source: 'nderf',
      source_id: sourceId,
      imported_at: new Date().toISOString(),
      tier: 'exploratory',
      triage_status: 'pending',
    });

  return error ? 'error' : 'added';
}

async function main() {
  console.log('=== NDERF Importer v2 ===\n');

  const args = process.argv.slice(2);
  const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;
  const skipCollection = args.includes('--skip-collection');

  let allEntryNums: number[] = [];

  if (!skipCollection) {
    // Phase 1: Collect all entry numbers from archive pages
    console.log('Phase 1: Collecting entry numbers from archive pages...\n');

    for (const page of ARCHIVE_PAGES) {
      process.stdout.write(`  Fetching ${page}...`);
      const entries = await fetchArchivePage(page);
      allEntryNums.push(...entries);
      console.log(` found ${entries.length} entries`);
      await sleep(500);
    }

    // Dedupe and sort
    allEntryNums = [...new Set(allEntryNums)].sort((a, b) => b - a);
    console.log(`\nTotal unique entry numbers: ${allEntryNums.length}\n`);

    // Save entry numbers to file for potential resume
    const fs = await import('fs');
    fs.writeFileSync('/tmp/nderf-entries.json', JSON.stringify(allEntryNums));
    console.log('Entry numbers saved to /tmp/nderf-entries.json\n');
  } else {
    // Load from file
    const fs = await import('fs');
    const data = fs.readFileSync('/tmp/nderf-entries.json', 'utf-8');
    allEntryNums = JSON.parse(data);
    console.log(`Loaded ${allEntryNums.length} entry numbers from file\n`);
  }

  // Phase 2: Fetch and import each NDE
  console.log('Phase 2: Fetching and importing NDEs...\n');

  let added = 0, skipped = 0, errors = 0, notFound = 0;
  const toProcess = limitArg ? allEntryNums.slice(0, limitArg) : allEntryNums;

  for (let i = 0; i < toProcess.length; i++) {
    const entryNum = toProcess[i];
    const record = await fetchNDE(entryNum);

    if (!record || !record.alias) {
      notFound++;
    } else {
      const result = await importNDE(record, entryNum);
      if (result === 'added') added++;
      else if (result === 'skipped') skipped++;
      else errors++;
    }

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${toProcess.length} | Added: ${added} | Skipped: ${skipped} | Not found: ${notFound} | Errors: ${errors}`);
    }

    await sleep(DELAY_MS);
  }

  console.log('\n\n=== Import Complete ===');
  console.log(`Processed: ${toProcess.length}`);
  console.log(`Added: ${added}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
