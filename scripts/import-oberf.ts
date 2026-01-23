/**
 * OBERF (Out of Body Experience Research Foundation) Importer
 * Same structure as NDERF, just different archive URLs
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

const DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchArchivePage(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return [];
    const html = await response.text();
    const matches = html.matchAll(/href=["'](?:https?:\/\/www\.nderf\.org\/)?(?:\.\.\/)?Experiences\/(1[^"']+\.html)["']/gi);
    const files = new Set<string>();
    for (const match of matches) {
      files.add(match[1]);
    }
    return Array.from(files);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return [];
  }
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

interface ParsedOBE {
  sourceId: string;
  title: string;
  alias: string;
  classification: string;
  narrative: string;
  rawData: Record<string, unknown>;
}

async function fetchAndParseOBE(filename: string): Promise<ParsedOBE | null> {
  const url = `https://www.nderf.org/Experiences/${filename}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? stripHtml(titleMatch[1]) : '';

    const filenameMatch = filename.match(/^1([^_]+(?:_[a-z])?)/i);
    let alias = filenameMatch ? filenameMatch[1].replace(/_/g, ' ') : 'Anonymous';
    alias = alias.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    let classification = 'OBE';
    if (filename.includes('_obe')) classification = 'OBE';
    else if (filename.includes('_nde')) classification = 'NDE';
    else if (filename.includes('_ste')) classification = 'STE';

    let narrative = '';
    const contentPatterns = [
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
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

    if (narrative.length < 200) {
      const descIdx = html.search(/experience\s*description|narrative|account/i);
      if (descIdx > 0) {
        const portion = html.slice(descIdx, descIdx + 10000);
        narrative = stripHtml(portion).slice(0, 5000);
      }
    }

    const sourceId = `oberf_html_${filename.replace('.html', '')}`;

    return {
      sourceId,
      title: `${alias} - ${classification}`,
      alias,
      classification,
      narrative: narrative.slice(0, 50000),
      rawData: { filename, page_title: pageTitle, url, classification },
    };
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error);
    return null;
  }
}

async function importOBE(parsed: ParsedOBE): Promise<'added' | 'skipped' | 'error'> {
  const { data: existing } = await supabase
    .from('aletheia_investigations')
    .select('id')
    .eq('source_id', parsed.sourceId)
    .eq('data_source', 'oberf')
    .single();

  if (existing) return 'skipped';

  const { error } = await supabase
    .from('aletheia_investigations')
    .insert({
      investigation_type: 'obe',
      title: parsed.title,
      description: parsed.narrative,
      raw_data: parsed.rawData,
      data_source: 'oberf',
      source_id: parsed.sourceId,
      imported_at: new Date().toISOString(),
      tier: 'exploratory',
      triage_status: 'pending',
    });

  return error ? 'error' : 'added';
}

async function main() {
  console.log('=== OBERF (Out of Body Experience) Importer ===\n');

  // OBERF archive page
  const archiveUrl = 'https://www.nderf.org/OBERF/obe_stories.htm';

  console.log('Fetching OBERF archive...');
  const response = await fetch(archiveUrl, { headers: { 'User-Agent': 'Aletheia-Research/1.0' } });
  const html = await response.text();

  // Get all experience links
  const matches = html.matchAll(/href=["'](?:https?:\/\/www\.nderf\.org\/)?(?:\.\.\/)?(?:OBERF\/|Experiences\/)(1[^"']+\.html)["']/gi);
  const files = new Set<string>();
  for (const match of matches) {
    files.add(match[1]);
  }

  const uniqueFiles = Array.from(files);
  console.log(`Found ${uniqueFiles.length} OBE files\n`);

  if (uniqueFiles.length === 0) {
    console.log('No files found. Trying alternate pattern...');
    // Try finding any links to experience pages
    const altMatches = html.matchAll(/href=["']([^"']*(?:obe|OBE)[^"']*\.html)["']/gi);
    for (const match of altMatches) {
      console.log(`  Found: ${match[1]}`);
    }
    return;
  }

  let added = 0, skipped = 0, errors = 0, failed = 0;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];
    const parsed = await fetchAndParseOBE(file);

    if (!parsed) {
      failed++;
    } else {
      const result = await importOBE(parsed);
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
