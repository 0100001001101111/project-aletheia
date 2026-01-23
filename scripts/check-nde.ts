import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

async function main() {
  // Get NDE investigations with full data
  const { data, error, count } = await supabase
    .from('aletheia_investigations')
    .select('*', { count: 'exact' })
    .eq('investigation_type', 'nde')
    .order('triage_score', { ascending: false, nullsFirst: false })
    .limit(25);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Total NDE investigations: ${count}\n`);

  for (const inv of data || []) {
    console.log(`=== ${inv.title || 'Untitled'} ===`);
    console.log('Full record:', JSON.stringify(inv, null, 2));
    console.log('\n---\n');
  }

  // Also check for any investigations mentioning NDE in title/description
  console.log('\n\nSearching for NDE-related content in other investigation types...\n');

  const { data: related } = await supabase
    .from('aletheia_investigations')
    .select('id, title, investigation_type, raw_data')
    .or('title.ilike.%near death%,title.ilike.%NDE%,title.ilike.%out of body%')
    .limit(10);

  if (related && related.length > 0) {
    console.log(`Found ${related.length} related investigations:\n`);
    for (const r of related) {
      console.log(`- [${r.investigation_type}] ${r.title}`);
    }
  }

  // Check investigation types breakdown
  console.log('\n\nInvestigation types breakdown:');
  const { data: types } = await supabase
    .from('aletheia_investigations')
    .select('investigation_type');

  const typeCounts: Record<string, number> = {};
  for (const t of types || []) {
    typeCounts[t.investigation_type] = (typeCounts[t.investigation_type] || 0) + 1;
  }
  console.log(typeCounts);
}

main();
