/**
 * NDERF HTML Scraper - Scrapes older archive pages that use direct HTML links
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

const DELAY_MS = 400;

// Older archive pages that use HTML file links
const OLD_ARCHIVE_PAGES = [
  '2_1_2024.html', '2_6_2023.html', '2_1_2023.html',
  '2_6_2022.html', '2_1_2022.html', '2_6_2021.html', '2_1_2021.html',
  '2_6_2020.html', '2_1_2020.html', '2_6_2019.html', '2_1_2019.html',
  '2_6_2018.html', '2_1_2018.html', '2_6_2017.html', '2_1_2017.html',
  '2_6_2016.html', '2_1_2016.html', '2_6_2015.html', '2_1_2015.html',
  '2_6_2014.html', '2_1_2014.html', '2_6_2013.html', '2_1_2013.html',
  '2_6_2012.html', '2_1_2012.html',
  '2_6_2011_2.html', '2_6_2011_1.html', '2_1_2011.html',
  '2_6_2010_2.html', '2_6_2010_1.html', '2_1_2010.html',
  '2_6_2009.html', '2_1_2009.html', '2_6_2008.html', '2_1_2008.html',
  '2_6_2007_2.html', '2_6_2007_1.html', '2_1_2007.html',
  '2_6_2006.html', '2_1_2006.html', '2_6_2005.html', '2_1_2005.html',
  '2_6_2004.html', '2_1_2004.html', '2_2003.html',
  '2_6_2002.html', '2_1_2002.html', '2_1998_2001.html',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchArchivePage(page: string): Promise<string[]> {
  const url = `https://www.nderf.org/Archives/${page}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return [];
    const html = await response.text();

    // Extract HTML file links from Experiences folder
    // Links can be full URLs or relative paths
    const matches = html.matchAll(/href=["'](?:https?:\/\/www\.nderf\.org\/)?(?:\.\.\/)?Experiences\/(1[^"']+\.html)["']/gi);
    const files = new Set<string>();
    for (const match of matches) {
      files.add(match[1]);
    }
    return Array.from(files);
  } catch (error) {
    console.error(`Error fetching ${page}:`, error);
    return [];
  }
}

function extractText(html: string, startMarker: string, endMarker: string): string {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return '';
  const searchStart = startIdx + startMarker.length;
  const endIdx = html.indexOf(endMarker, searchStart);
  if (endIdx === -1) return '';
  return html.slice(searchStart, endIdx).trim();
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

interface ParsedNDE {
  sourceId: string;
  title: string;
  alias: string;
  gender: string | null;
  experienceDate: string | null;
  classification: string;
  narrative: string;
  rawData: Record<string, unknown>;
}

async function fetchAndParseNDE(filename: string): Promise<ParsedNDE | null> {
  const url = `https://www.nderf.org/Experiences/${filename}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();

    // Extract title/ID from page (e.g., "4793 Jill F Probable NDE 9021")
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? stripHtml(titleMatch[1]) : '';

    // Extract alias from filename (e.g., "1jill_f_probable_nde_9021.html" -> "Jill F")
    const filenameMatch = filename.match(/^1([^_]+(?:_[a-z])?)/i);
    let alias = filenameMatch ? filenameMatch[1].replace(/_/g, ' ') : 'Anonymous';
    alias = alias.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Extract classification from filename
    let classification = 'NDE';
    if (filename.includes('probable_nde')) classification = 'Probable NDE';
    else if (filename.includes('possible_nde')) classification = 'Possible NDE';
    else if (filename.includes('_fde')) classification = 'FDE';
    else if (filename.includes('_sde')) classification = 'SDE';
    else if (filename.includes('_ste')) classification = 'STE';
    else if (filename.includes('_obe')) classification = 'OBE';
    else if (filename.includes('_adc')) classification = 'ADC';
    else if (filename.includes('_dbv')) classification = 'DBV';

    // Extract gender
    let gender: string | null = null;
    if (html.includes('>Male<') || html.includes('>male<')) gender = 'Male';
    else if (html.includes('>Female<') || html.includes('>female<')) gender = 'Female';

    // Try to extract experience date
    let experienceDate: string | null = null;
    const dateMatch = html.match(/Experience date[:\s]*([^<\n]+)/i);
    if (dateMatch) experienceDate = stripHtml(dateMatch[1]);

    // Extract narrative - look for the main content area
    let narrative = '';

    // Try different content patterns
    const contentPatterns = [
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*experience[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<p[^>]*>([\s\S]*?)<\/p>/gi,
    ];

    for (const pattern of contentPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const text = stripHtml(match[1]);
        if (text.length > narrative.length && text.length > 100) {
          narrative = text;
        }
      }
    }

    // If still no narrative, try to get all text between specific markers
    if (narrative.length < 200) {
      // Get text after "Experience description:" or similar
      const descIdx = html.search(/experience\s*description|narrative|account/i);
      if (descIdx > 0) {
        const portion = html.slice(descIdx, descIdx + 10000);
        narrative = stripHtml(portion).slice(0, 5000);
      }
    }

    // Build source ID from filename
    const sourceId = `nderf_html_${filename.replace('.html', '')}`;

    return {
      sourceId,
      title: `${alias} - ${classification}`,
      alias,
      gender,
      experienceDate,
      classification,
      narrative: narrative.slice(0, 50000),
      rawData: {
        filename,
        page_title: pageTitle,
        url,
        gender,
        experience_date: experienceDate,
        classification,
      },
    };
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error);
    return null;
  }
}

async function importNDE(parsed: ParsedNDE): Promise<'added' | 'skipped' | 'error'> {
  // Check if exists
  const { data: existing } = await supabase
    .from('aletheia_investigations')
    .select('id')
    .eq('source_id', parsed.sourceId)
    .eq('data_source', 'nderf')
    .single();

  if (existing) return 'skipped';

  const { error } = await supabase
    .from('aletheia_investigations')
    .insert({
      investigation_type: 'nde',
      title: parsed.title,
      description: parsed.narrative,
      raw_data: parsed.rawData,
      data_source: 'nderf',
      source_id: parsed.sourceId,
      imported_at: new Date().toISOString(),
      tier: 'exploratory',
      triage_status: 'pending',
    });

  return error ? 'error' : 'added';
}

async function main() {
  console.log('=== NDERF HTML Scraper ===\n');

  const args = process.argv.slice(2);
  const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

  // Phase 1: Collect all HTML file links
  console.log('Phase 1: Collecting HTML file links from archive pages...\n');

  const allFiles: string[] = [];
  for (const page of OLD_ARCHIVE_PAGES) {
    process.stdout.write(`  Fetching ${page}...`);
    const files = await fetchArchivePage(page);
    allFiles.push(...files);
    console.log(` found ${files.length} files`);
    await sleep(500);
  }

  // Dedupe
  const uniqueFiles = [...new Set(allFiles)];
  console.log(`\nTotal unique HTML files: ${uniqueFiles.length}\n`);

  // Phase 2: Fetch and import each NDE
  console.log('Phase 2: Fetching and importing NDEs...\n');

  let added = 0, skipped = 0, errors = 0, failed = 0;
  const toProcess = limitArg ? uniqueFiles.slice(0, limitArg) : uniqueFiles;

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i];
    const parsed = await fetchAndParseNDE(file);

    if (!parsed) {
      failed++;
    } else {
      const result = await importNDE(parsed);
      if (result === 'added') added++;
      else if (result === 'skipped') skipped++;
      else errors++;
    }

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${toProcess.length} | Added: ${added} | Skipped: ${skipped} | Failed: ${failed} | Errors: ${errors}`);
    }

    await sleep(DELAY_MS);
  }

  console.log('\n\n=== Import Complete ===');
  console.log(`Processed: ${toProcess.length}`);
  console.log(`Added: ${added}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Failed to parse: ${failed}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
