/**
 * Analyze NDE accounts for patterns and interesting cases
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

interface NdeRecord {
  id: string;
  title: string;
  description: string;
  raw_data: Record<string, unknown>;
}

async function main() {
  console.log('=== NDE Pattern Analysis ===\n');

  // Get all NDEs
  const { data: ndes, count } = await supabase
    .from('aletheia_investigations')
    .select('id, title, description, raw_data', { count: 'exact' })
    .eq('investigation_type', 'nde');

  console.log(`Total NDEs: ${count}\n`);

  if (!ndes || ndes.length === 0) {
    console.log('No NDEs found');
    return;
  }

  // Pattern searches
  const patterns = {
    light: /bright\s+light|white\s+light|golden\s+light|light\s+at\s+the\s+end|brilliant\s+light/i,
    tunnel: /tunnel|passageway|corridor/i,
    beings: /being[s]?|entity|entities|angel[s]?|figure[s]?|presence/i,
    deceased: /deceased|dead\s+relative|grandmother|grandfather|mother|father.*passed|who\s+had\s+died/i,
    lifeReview: /life\s+review|life\s+flash|saw\s+my\s+life|reviewed\s+my\s+life|movie\s+of\s+my\s+life/i,
    outOfBody: /out\s+of\s+(?:my\s+)?body|OBE|looking\s+down\s+at|saw\s+my(?:self)?\s+(?:body|lying)|floated?\s+above/i,
    peace: /peace(?:ful)?|calm|serene|tranquil|bliss/i,
    love: /unconditional\s+love|overwhelming\s+love|pure\s+love|love\s+(?:like|that)\s+I/i,
    knowledge: /knew\s+everything|all\s+knowledge|understanding|omniscient|infinite\s+knowledge/i,
    choice: /choice|decision|told\s+(?:to\s+)?(?:go\s+back|return)|not\s+(?:your|my)\s+time|sent\s+back/i,
    hellish: /hell(?:ish)?|demon[s]?|dark(?:ness)?|evil|terrif(?:y|ied|ying)|scary|frightening/i,
    medical: /cardiac\s+arrest|heart\s+(?:attack|stopped)|drowning|surgery|accident|overdose|anaphylaxis/i,
  };

  const matches: Record<string, NdeRecord[]> = {};
  for (const key of Object.keys(patterns)) {
    matches[key] = [];
  }

  // Scan all NDEs
  for (const nde of ndes as NdeRecord[]) {
    const text = `${nde.title} ${nde.description}`.toLowerCase();

    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        matches[key].push(nde);
      }
    }
  }

  // Print pattern frequency
  console.log('=== Pattern Frequency ===\n');
  const sorted = Object.entries(matches)
    .map(([key, arr]) => ({ key, count: arr.length, pct: (arr.length / ndes.length * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  for (const { key, count, pct } of sorted) {
    console.log(`  ${key.padEnd(15)} ${String(count).padStart(4)} (${pct}%)`);
  }

  // Find interesting cases - NDEs with multiple rare patterns
  console.log('\n=== Most Pattern-Rich NDEs ===\n');

  const ndePatternCounts: Array<{ nde: NdeRecord; patterns: string[]; count: number }> = [];

  for (const nde of ndes as NdeRecord[]) {
    const text = `${nde.title} ${nde.description}`.toLowerCase();
    const foundPatterns: string[] = [];

    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        foundPatterns.push(key);
      }
    }

    ndePatternCounts.push({ nde, patterns: foundPatterns, count: foundPatterns.length });
  }

  const top = ndePatternCounts.sort((a, b) => b.count - a.count).slice(0, 10);

  for (const item of top) {
    console.log(`\n--- ${item.nde.title} (${item.count} patterns) ---`);
    console.log(`Patterns: ${item.patterns.join(', ')}`);
    const desc = item.nde.description?.slice(0, 500) || '(no description)';
    console.log(`Excerpt: ${desc}...`);
  }

  // Look for veridical claims
  console.log('\n\n=== Potential Veridical Claims ===');
  console.log('(Cases mentioning verified/confirmed observations)\n');

  const veridicalPatterns = /verifi|confirm|later\s+found\s+out|turned\s+out\s+to\s+be|accurate|correctly\s+described|couldn't\s+have\s+known/i;

  const veridicalCases = (ndes as NdeRecord[]).filter(nde => {
    const text = `${nde.description}`;
    return veridicalPatterns.test(text);
  }).slice(0, 5);

  for (const nde of veridicalCases) {
    console.log(`\n--- ${nde.title} ---`);
    const desc = nde.description?.slice(0, 600) || '(no description)';
    console.log(desc + '...');
  }
}

main().catch(console.error);
