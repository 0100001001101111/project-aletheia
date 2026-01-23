/**
 * ADCRF (After Death Communication Research Foundation) Importer
 * Same structure as NDERF, different archive URLs
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

interface ParsedADC {
  sourceId: string;
  title: string;
  alias: string;
  classification: string;
  narrative: string;
  rawData: Record<string, unknown>;
}

async function fetchAndParseADC(filename: string, baseUrl: string): Promise<ParsedADC | null> {
  const url = baseUrl.includes('Experiences') ? `https://www.nderf.org/Experiences/${filename}` : `https://www.nderf.org/ADCRF/${filename}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? stripHtml(titleMatch[1]) : '';

    const filenameMatch = filename.match(/^1?([^_]+(?:_[a-z])?)/i);
    let alias = filenameMatch ? filenameMatch[1].replace(/_/g, ' ') : 'Anonymous';
    alias = alias.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const classification = 'ADC';

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
      const descIdx = html.search(/experience\s*description|narrative|account|communication/i);
      if (descIdx > 0) {
        const portion = html.slice(descIdx, descIdx + 10000);
        narrative = stripHtml(portion).slice(0, 5000);
      }
    }

    const sourceId = `adcrf_html_${filename.replace('.html', '')}`;

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

  // ADCRF archive page
  const archiveUrl = 'https://www.nderf.org/ADCRF/adc_stories.htm';

  console.log('Fetching ADCRF archive...');
  const response = await fetch(archiveUrl, { headers: { 'User-Agent': 'Aletheia-Research/1.0' } });
  const html = await response.text();

  // Get all experience links - ADC files can be in ADCRF/ or Experiences/
  const matches = html.matchAll(/href=["'](?:https?:\/\/www\.nderf\.org\/)?(?:\.\.\/)?(?:ADCRF\/|Experiences\/)?([^"']+\.html)["']/gi);
  const files = new Set<string>();
  for (const match of matches) {
    const file = match[1];
    // Filter for likely ADC story files
    if (file.includes('adc') || file.match(/^1[a-z]/i)) {
      files.add(file);
    }
  }

  const uniqueFiles = Array.from(files);
  console.log(`Found ${uniqueFiles.length} ADC files\n`);

  if (uniqueFiles.length === 0) {
    console.log('No files found via main pattern. Checking page structure...');
    // Show some of the HTML to debug
    console.log('Sample links found:');
    const allLinks = html.matchAll(/href=["']([^"']+)["']/gi);
    let count = 0;
    for (const link of allLinks) {
      if (link[1].includes('.html') && count < 20) {
        console.log(`  ${link[1]}`);
        count++;
      }
    }
    return;
  }

  let added = 0, skipped = 0, errors = 0, failed = 0;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];
    const parsed = await fetchAndParseADC(file, 'Experiences');

    if (!parsed) {
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
