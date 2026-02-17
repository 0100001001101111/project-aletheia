/**
 * Aggregate counts for exploratory tier investigations
 * Returns counts grouped by type with date ranges
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('get_exploratory_aggregate');

    if (error) {
      // Fallback: direct query if RPC doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('aletheia_investigations')
        .select('investigation_type, created_at')
        .eq('tier', 'exploratory') as { data: Array<{ investigation_type: string; created_at: string }> | null; error: typeof error };

      if (fallbackError) {
        return NextResponse.json(
          { error: `Failed to fetch aggregate: ${fallbackError.message}` },
          { status: 500 }
        );
      }

      // Aggregate in JS
      const groups: Record<string, { count: number; earliest: string; latest: string }> = {};
      for (const row of (fallbackData || [])) {
        const type = row.investigation_type;
        if (!groups[type]) {
          groups[type] = { count: 0, earliest: row.created_at, latest: row.created_at };
        }
        groups[type].count++;
        if (row.created_at < groups[type].earliest) groups[type].earliest = row.created_at;
        if (row.created_at > groups[type].latest) groups[type].latest = row.created_at;
      }

      return NextResponse.json({
        data: Object.entries(groups).map(([type, stats]) => ({
          type,
          count: stats.count,
          earliest: stats.earliest,
          latest: stats.latest,
        })),
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Aggregate API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
