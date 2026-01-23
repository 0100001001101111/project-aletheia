import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://diwkdydpjakvwmzyijrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd2tkeWRwamFrdndtenlpanJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5NzY1OCwiZXhwIjoyMDgzMDczNjU4fQ.3QbnC0cstSGUCWM6esGdcLyoVVZqInSPS_xgwnapnKc'
);

async function main() {
  const { count, error } = await supabase
    .from('aletheia_investigations')
    .select('*', { count: 'exact', head: true })
    .eq('investigation_type', 'nde');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`NDE count: ${count}`);

  // Get latest imported
  const { data: latest } = await supabase
    .from('aletheia_investigations')
    .select('title, source_id, imported_at')
    .eq('investigation_type', 'nde')
    .eq('data_source', 'nderf')
    .order('imported_at', { ascending: false })
    .limit(3);

  if (latest && latest.length > 0) {
    console.log('\nLatest imports:');
    for (const rec of latest) {
      console.log(`  - ${rec.title} (${rec.source_id})`);
    }
  }
}

main();
