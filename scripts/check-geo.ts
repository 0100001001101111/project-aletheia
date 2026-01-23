import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

async function main() {
  const { data, count } = await supabase
    .from('aletheia_investigations')
    .select('id, title, description, raw_data', { count: 'exact' })
    .eq('investigation_type', 'geophysical')
    .limit(5);

  console.log(`Geophysical records: ${count}\n`);
  for (const r of data || []) {
    console.log(`- ${r.title}`);
    console.log(`  ${r.description?.slice(0, 150)}...`);
  }
}
main();
