/**
 * ADCRF (After Death Communication Research Foundation) Importer
 * Site: adcrf.org
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

const DELAY_MS = 400;
const BASE_URL = 'https://www.adcrf.org';

// Archive pages on adcrf.org
const ARCHIVE_PAGES = [
  'new_stories.html',
  'archives_2017_2018.html',
  'archives_2015_2016.html',
  'archives_2011_2014.html',
  'archives_2010_2012.htm',
  'archives_2008_2010.htm',
  'archives_2003_2007.htm',
  'archived_2002.htm',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchArchivePage(page: string): Promise<string[]> {
  const url = `${BASE_URL}/${page}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) {
      console.log(` (${response.status})`);
      return [];
    }
    const html = await response.text();

    // Extract links to individual ADC stories
    // Pattern: name_adc.htm or name_adcs.htm
    const matches = html.matchAll(/href=["']([^"']*?_adcs?\.htm)["']/gi);
    const files = new Set<string>();
    for (const match of matches) {
      let file = match[1];
      // Remove any leading path/URL components
      if (file.includes('/')) {
        file = file.split('/').pop() || file;
      }
      // Skip if it's an archive page
      if (!file.includes('archive')) {
        files.add(file);
      }
    }
    return Array.from(files);
  } catch (error) {
    console.error(`Error fetching ${page}:`, error);
    return [];
  }
}

interface ParsedADC {
  sourceId: string;
  title: string;
  alias: string;
  narrative: string;
  rawData: Record<string, unknown>;
}

async function fetchAndParseADC(filename: string): Promise<ParsedADC | null> {
  const url = `${BASE_URL}/${filename}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? stripHtml(titleMatch[1]) : '';

    // Extract alias from filename (e.g., "malin_s_adc.htm" -> "Malin S")
    const nameMatch = filename.match(/^([a-z]+(?:_[a-z]+)?)_adcs?\.htm/i);
    let alias = nameMatch ? nameMatch[1].replace(/_/g, ' ') : 'Anonymous';
    alias = alias.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Extract narrative from page content
    // ADCRF pages don't have proper <body> tags, so look for "Experience description:" marker
    let narrative = '';

    // Method 1: Look for content after "Experience description:"
    const descMatch = html.match(/experience\s*description:?\s*<\/span>([\s\S]*?)(?:<br><br><span[^>]*>(?:Background|Was the experience)|$)/i);
    if (descMatch) {
      narrative = stripHtml(descMatch[1]);
    }

    // Method 2: Fallback - extract from </head> to end if no description found
    if (narrative.length < 100) {
      const headEndIdx = html.indexOf('</head>');
      if (headEndIdx > 0) {
        const content = html.slice(headEndIdx + 7);
        // Remove scripts and styles
        const cleaned = content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        narrative = stripHtml(cleaned);
      }
    }

    // Clean up
    narrative = narrative.slice(0, 50000);

    const sourceId = `adcrf_${filename.replace('.htm', '')}`;

    return {
      sourceId,
      title: `${alias} - ADC`,
      alias,
      narrative,
      rawData: { filename, page_title: pageTitle, url, classification: 'ADC', source: 'adcrf.org' },
    };
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error);
    return null;
  }
}

async function importADC(parsed: ParsedADC): Promise<'added' | 'skipped' | 'error'> {
  const { data: existing } = await supabase
    .from('aletheia_investigations')
    .select('id')
    .eq('source_id', parsed.sourceId)
    .eq('data_source', 'adcrf')
    .single();

  if (existing) return 'skipped';

  const { error } = await supabase
    .from('aletheia_investigations')
    .insert({
      investigation_type: 'crisis_apparition', // ADCs are related to crisis apparitions
      title: parsed.title,
      description: parsed.narrative,
      raw_data: parsed.rawData,
      data_source: 'adcrf',
      source_id: parsed.sourceId,
      imported_at: new Date().toISOString(),
      tier: 'exploratory',
      triage_status: 'pending',
    });

  return error ? 'error' : 'added';
}

async function main() {
  console.log('=== ADCRF (After Death Communication) Importer ===\n');

  // Phase 1: Collect all story files from archive pages
  console.log('Phase 1: Collecting story links from archive pages...\n');

  const allFiles: string[] = [];
  for (const page of ARCHIVE_PAGES) {
    process.stdout.write(`  Fetching ${page}...`);
    const files = await fetchArchivePage(page);
    allFiles.push(...files);
    console.log(` found ${files.length} stories`);
    await sleep(500);
  }

  const uniqueFiles = [...new Set(allFiles)];
  console.log(`\nTotal unique story files: ${uniqueFiles.length}\n`);

  if (uniqueFiles.length === 0) {
    console.log('No files found. Check archive page structure.');
    return;
  }

  // Phase 2: Fetch and import each story
  console.log('Phase 2: Fetching and importing ADCs...\n');

  let added = 0, skipped = 0, errors = 0, failed = 0;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];
    const parsed = await fetchAndParseADC(file);

    if (!parsed || parsed.narrative.length < 100) {
      failed++;
    } else {
      const result = await importADC(parsed);
      if (result === 'added') added++;
      else if (result === 'skipped') skipped++;
      else errors++;
    }

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${uniqueFiles.length} | Added: ${added} | Skipped: ${skipped} | Failed: ${failed}`);
    }

    await sleep(DELAY_MS);
  }

  console.log('\n\n=== Import Complete ===');
  console.log(`Processed: ${uniqueFiles.length}`);
  console.log(`Added: ${added}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
