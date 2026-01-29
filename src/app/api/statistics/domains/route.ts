import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateAllDomainStats,
  calculateDomainStats,
  RESEARCH_DOMAINS,
} from '@/lib/domain-stats-calculator';
import type { InvestigationType } from '@/types/database';

// Create admin client for statistics (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/statistics/domains - Get statistics for all domains or specific domain
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') as InvestigationType | null;
    const useCache = searchParams.get('cache') !== 'false';

    // Single domain request
    if (domain) {
      if (!RESEARCH_DOMAINS.includes(domain as typeof RESEARCH_DOMAINS[number])) {
        return NextResponse.json(
          { error: 'Invalid domain' },
          { status: 400 }
        );
      }

      // Check cache first
      if (useCache) {
        const { data: cached } = await supabaseAdmin
          .from('aletheia_domain_statistics_cache')
          .select('*')
          .eq('domain', domain)
          .single();

        // Return cached if less than 1 hour old
        if (cached) {
          const cacheAge = Date.now() - new Date(cached.computed_at).getTime();
          const oneHour = 60 * 60 * 1000;

          if (cacheAge < oneHour) {
            return NextResponse.json({
              ...cached.stats_json,
              domain: cached.domain,
              recordCount: cached.record_count,
              avgScore: cached.avg_score,
              cached: true,
              computedAt: cached.computed_at,
            });
          }
        }
      }

      // Calculate fresh stats
      const stats = await calculateDomainStats(supabaseAdmin, domain);

      // Update cache
      await supabaseAdmin
        .from('aletheia_domain_statistics_cache')
        .upsert({
          domain,
          stats_json: stats,
          record_count: stats.recordCount,
          avg_score: stats.avgScore,
          min_score: stats.minScore,
          max_score: stats.maxScore,
          verified_count: stats.verifiedCount,
          provisional_count: stats.provisionalCount,
          rejected_count: stats.rejectedCount,
          oldest_record: stats.oldestRecord,
          newest_record: stats.newestRecord,
          score_distribution: stats.scoreDistribution,
          temporal_coverage: stats.temporalCoverage,
          computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'domain',
        });

      return NextResponse.json({
        ...stats,
        cached: false,
        computedAt: new Date().toISOString(),
      });
    }

    // All domains request
    // Check cache for full comparison
    if (useCache) {
      const { data: cachedAll } = await supabaseAdmin
        .from('aletheia_domain_statistics_cache')
        .select('*')
        .in('domain', RESEARCH_DOMAINS);

      // If we have all domains cached and all are fresh, return cached
      if (cachedAll && cachedAll.length === RESEARCH_DOMAINS.length) {
        const oneHour = 60 * 60 * 1000;
        const allFresh = cachedAll.every((c) => {
          const cacheAge = Date.now() - new Date(c.computed_at).getTime();
          return cacheAge < oneHour;
        });

        if (allFresh) {
          const domains = cachedAll.map((c) => ({
            ...c.stats_json,
            domain: c.domain,
            recordCount: c.record_count,
            avgScore: c.avg_score,
          }));

          return NextResponse.json({
            domains,
            totalRecords: domains.reduce((sum, d) => sum + (d.recordCount || 0), 0),
            avgReliability: domains.length > 0
              ? domains.reduce((sum, d) => sum + (d.reliabilityIndex || 0), 0) / domains.length
              : 0,
            cached: true,
            lastUpdated: Math.max(...cachedAll.map((c) => new Date(c.computed_at).getTime())),
          });
        }
      }
    }

    // Calculate fresh stats for all domains
    const comparison = await calculateAllDomainStats(supabaseAdmin);

    // Update cache for all domains
    for (const stats of comparison.domains) {
      await supabaseAdmin
        .from('aletheia_domain_statistics_cache')
        .upsert({
          domain: stats.domain,
          stats_json: stats,
          record_count: stats.recordCount,
          avg_score: stats.avgScore,
          min_score: stats.minScore,
          max_score: stats.maxScore,
          verified_count: stats.verifiedCount,
          provisional_count: stats.provisionalCount,
          rejected_count: stats.rejectedCount,
          oldest_record: stats.oldestRecord,
          newest_record: stats.newestRecord,
          score_distribution: stats.scoreDistribution,
          temporal_coverage: stats.temporalCoverage,
          computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'domain',
        });
    }

    return NextResponse.json({
      ...comparison,
      cached: false,
    });
  } catch (error) {
    console.error('Statistics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
