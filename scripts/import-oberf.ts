/**
 * OBERF (Out of Body Experience Research Foundation) Importer
 * Site: oberf.org
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

const DELAY_MS = 400;
const BASE_URL = 'https://www.oberf.org';

// Archive pages on oberf.org
const ARCHIVE_PAGES = [
  'sobe_stories.htm',
  'sobe_stories3.htm',
  'sobe_stories2.htm',
  'sobe_stories1.htm',
  'stories_obe.htm',
  'obethru2013.htm',
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
    if (!response.ok) return [];
    const html = await response.text();

    // Extract links to individual stories (.htm files)
    // Patterns: name_sobe.htm, name_ste.htm, name_obe.htm, name_ndelike.htm, etc.
    const matches = html.matchAll(/href=["']([^"']*?(?:_sobe|_obe|_ste|_ndelike|_prayer|_meditation)[^"']*\.htm)["']/gi);
    const files = new Set<string>();
    for (const match of matches) {
      let file = match[1];
      // Remove any leading path components
      if (file.includes('/')) {
        file = file.split('/').pop() || file;
      }
      files.add(file);
    }
    return Array.from(files);
  } catch (error) {
    console.error(`Error fetching ${page}:`, error);
    return [];
  }
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
  const url = `${BASE_URL}/${filename}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Aletheia-Research/1.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? stripHtml(titleMatch[1]) : '';

    // Extract alias from filename (e.g., "kris_w_sobe.htm" -> "Kris W")
    const nameMatch = filename.match(/^([a-z]+(?:_[a-z]+)?)_(?:sobe|obe|ste|ndelike|prayer|meditation)/i);
    let alias = nameMatch ? nameMatch[1].replace(/_/g, ' ') : 'Anonymous';
    alias = alias.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Determine classification
    let classification = 'OBE';
    if (filename.includes('_ste')) classification = 'STE';
    else if (filename.includes('_ndelike')) classification = 'NDE-like';
    else if (filename.includes('_prayer')) classification = 'Prayer';
    else if (filename.includes('_meditation')) classification = 'Meditation';

    // Extract narrative from page body
    // OBERF stores narratives in blue-colored spans
    let narrative = '';

    // Method 1: Extract blue text spans (main narrative content)
    const blueTextMatches = html.matchAll(/<span[^>]*color:\s*blue[^>]*>([\s\S]*?)<\/span>/gi);
    const blueTexts: string[] = [];
    for (const match of blueTextMatches) {
      const text = stripHtml(match[1]);
      if (text.length > 20) {
        blueTexts.push(text);
      }
    }
    narrative = blueTexts.join(' ');

    // Method 2: Fallback to body if no blue text found
    if (narrative.length < 200) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        // Look for text after "Experience description:"
        const descMatch = bodyMatch[1].match(/experience\s*description[:\s]*([\s\S]*)/i);
        if (descMatch) {
          narrative = stripHtml(descMatch[1]).slice(0, 50000);
        } else {
          narrative = stripHtml(bodyMatch[1]);
        }
      }
    }

    narrative = narrative.slice(0, 50000);

    const sourceId = `oberf_${filename.replace('.htm', '')}`;

    return {
      sourceId,
      title: `${alias} - ${classification}`,
      alias,
      classification,
      narrative,
      rawData: { filename, page_title: pageTitle, url, classification, source: 'oberf.org' },
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
      investigation_type: 'nde',  // OBE mapped to NDE (related phenomena)
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
  console.log('Phase 2: Fetching and importing OBEs...\n');

  let added = 0, skipped = 0, errors = 0, failed = 0;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];
    const parsed = await fetchAndParseOBE(file);

    if (!parsed || parsed.narrative.length < 100) {
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
