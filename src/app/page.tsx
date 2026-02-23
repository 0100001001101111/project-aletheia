/**
 * Project Aletheia - Landing Page
 * Rigorous Infrastructure for Anomaly Research
 */

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { Navigation } from '@/components/layout/Navigation';

// Fetch stats from database
async function getStats() {
  try {
    const supabase = await createServerClient();

    // Get counts by tier (research vs exploratory)
    const [researchCount, exploratoryCount] = await Promise.all([
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('tier', 'research'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('tier', 'exploratory'),
    ]);

    // Get counts by type for research tier only
    const [ndeCount, ganzfeldCount, crisisCount, stargateCount, geophysicalCount] = await Promise.all([
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'nde').eq('tier', 'research'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'ganzfeld').eq('tier', 'research'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'crisis_apparition').eq('tier', 'research'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'stargate').eq('tier', 'research'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'geophysical').eq('tier', 'research'),
    ]);

    const investigationCounts = {
      nde: ndeCount.count || 0,
      ganzfeld: ganzfeldCount.count || 0,
      crisis: crisisCount.count || 0,
      stargate: stargateCount.count || 0,
      geophysical: geophysicalCount.count || 0,
      research: researchCount.count || 0,
      exploratory: exploratoryCount.count || 0,
      total: (researchCount.count || 0) + (exploratoryCount.count || 0),
    };

    // Get pattern count
    const { count: patternCount } = await supabase
      .from('aletheia_pattern_matches')
      .select('id', { count: 'exact', head: true });

    // Get prediction counts efficiently
    const [totalPredictions, confirmedCount, refutedCount, testingCount, openCount] = await Promise.all([
      supabase.from('aletheia_predictions').select('id', { count: 'exact', head: true }),
      supabase.from('aletheia_predictions').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabase.from('aletheia_predictions').select('id', { count: 'exact', head: true }).eq('status', 'refuted'),
      supabase.from('aletheia_predictions').select('id', { count: 'exact', head: true }).eq('status', 'testing'),
      supabase.from('aletheia_predictions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    const predictionStats = {
      total: totalPredictions.count || 0,
      confirmed: confirmedCount.count || 0,
      refuted: refutedCount.count || 0,
      testing: testingCount.count || 0,
      open: openCount.count || 0,
    };

    // Get agent findings stats
    const [totalFindings, approvedFindings, rejectedFindings, pendingFindings, agentCount] = await Promise.all([
      supabase.from('aletheia_agent_findings').select('id', { count: 'exact', head: true }),
      supabase.from('aletheia_agent_findings').select('id', { count: 'exact', head: true }).eq('review_status', 'approved'),
      supabase.from('aletheia_agent_findings').select('id', { count: 'exact', head: true }).eq('review_status', 'rejected'),
      supabase.from('aletheia_agent_findings').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
      supabase.from('aletheia_agent_findings').select('agent_id').limit(1000),
    ]);

    const uniqueAgents = new Set((agentCount.data || []).map((r: { agent_id: string }) => r.agent_id)).size;
    const totalF = totalFindings.count || 0;
    const rejectedF = rejectedFindings.count || 0;
    const rejectionRate = totalF > 0 ? Math.round((rejectedF / totalF) * 100) : 0;

    const findingsStats = {
      total: totalF,
      approved: approvedFindings.count || 0,
      rejected: rejectedF,
      pending: pendingFindings.count || 0,
      agents: uniqueAgents,
      rejectionRate,
    };

    return {
      investigations: investigationCounts,
      patterns: patternCount || 0,
      predictions: predictionStats,
      findings: findingsStats,
    };
  } catch {
    return {
      investigations: { nde: 0, ganzfeld: 0, crisis: 0, stargate: 0, geophysical: 0, research: 0, exploratory: 0, total: 0 },
      patterns: 0,
      predictions: { total: 0, confirmed: 0, refuted: 0, testing: 0, open: 0 },
      findings: { total: 0, approved: 0, rejected: 0, pending: 0, agents: 0, rejectionRate: 0 },
    };
  }
}

// Fetch recent activity
async function getRecentActivity() {
  try {
    const supabase = await createServerClient();

    // Get recent predictions
    const { data: recentPredictions } = await supabase
      .from('aletheia_predictions')
      .select('id, hypothesis, status, resolved_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5) as { data: Array<{ id: string; hypothesis: string; status: string; resolved_at: string | null; created_at: string }> | null };

    // Get recent agent findings for the live feed
    const { data: recentFindings } = await supabase
      .from('aletheia_agent_findings')
      .select('id, agent_id, title, confidence, review_status, created_at')
      .order('created_at', { ascending: false })
      .limit(8) as { data: Array<{ id: string; agent_id: string; title: string; confidence: number; review_status: string; created_at: string }> | null };

    return {
      predictions: recentPredictions || [],
      findings: recentFindings || [],
    };
  } catch {
    return { predictions: [], findings: [] };
  }
}


export default async function LandingPage() {
  const stats = await getStats();
  const activity = await getRecentActivity();

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* ==================== HEADER ==================== */}
      <Navigation transparent />

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient grid-background">
        {/* Decorative orbs */}
        <div className="orb orb-purple w-96 h-96 -top-48 -left-48" />
        <div className="orb orb-blue w-64 h-64 top-1/3 -right-32" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-brand-300 text-sm font-medium">Autonomous Research Infrastructure</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-zinc-100 mb-6 leading-tight">
            <span className="gradient-text">ALETHEIA</span>
          </h1>

          {/* Subhead */}
          <p className="text-xl sm:text-2xl text-zinc-300 font-light mb-4">
            25 autonomous research agents. Adversarial verification. Open findings.
          </p>

          {/* Tagline */}
          <p className="text-lg text-brand-400 font-medium mb-12">
            Falsifiable predictions. 37% rejection rate. A $50/month research lab on a Raspberry Pi.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/investigations"
              className="px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5"
            >
              Explore Research
            </Link>
            <Link
              href="/submit"
              className="px-8 py-4 border border-brand-500/30 hover:border-brand-500/60 text-brand-300 hover:text-white font-semibold rounded-xl transition-all hover:bg-brand-500/10"
            >
              Submit Data
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce">
            <svg className="w-6 h-6 mx-auto text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ==================== THE PROBLEM ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">The Problem</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Why anomaly research stays underground</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Career Risk */}
            <div className="group p-8 rounded-2xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-3">Career Risk</h3>
              <p className="text-zinc-400 leading-relaxed">
                Scientists can&apos;t publish anomaly research without stigma. Tenure committees don&apos;t reward
                curiosity about edge cases.
              </p>
            </div>

            {/* Card 2: No Infrastructure */}
            <div className="group p-8 rounded-2xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-3">No Infrastructure</h3>
              <p className="text-zinc-400 leading-relaxed">
                Amateurs lack standardized methodology and tools. Good data gets buried in unstructured reports and forum
                posts.
              </p>
            </div>

            {/* Card 3: Siloed Data */}
            <div className="group p-8 rounded-2xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-3">Siloed Data</h3>
              <p className="text-zinc-400 leading-relaxed">
                NDE researchers don&apos;t talk to geophysicists. Remote viewing archives don&apos;t connect to
                consciousness studies. Patterns stay hidden.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ==================== SELF-CORRECTING PIPELINE ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">Adversarial Verification</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Agents that correct each other</p>
            <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
              Every finding passes through an adversarial pipeline. Skeptic audits independently, errors get caught, and corrections propagate automatically.
            </p>
          </div>

          {/* Pipeline Steps */}
          <div className="space-y-0">
            {([
              { agent: 'Deep Miner', action: 'Analyzes raw data, extracts statistical signals', dotClass: 'bg-brand-400 ring-brand-400/20', textClass: 'text-brand-400', step: '01' },
              { agent: 'Skeptic', action: 'Audits independently — checks methodology, flags errors', dotClass: 'bg-red-400 ring-red-400/20', textClass: 'text-red-400', step: '02' },
              { agent: 'System', action: 'Error caught, correction queued automatically', dotClass: 'bg-amber-400 ring-amber-400/20', textClass: 'text-amber-400', step: '03' },
              { agent: 'Deep Miner', action: 'Reruns analysis with corrections applied', dotClass: 'bg-blue-400 ring-blue-400/20', textClass: 'text-blue-400', step: '04' },
              { agent: 'Synthesis', action: 'Notes caveats, updates confidence score', dotClass: 'bg-green-400 ring-green-400/20', textClass: 'text-green-400', step: '05' },
            ] as const).map((item, i) => (
              <div key={i} className="flex items-stretch gap-4 sm:gap-6">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center w-8 flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${item.dotClass} ring-4 flex-shrink-0 mt-6`} />
                  {i < 4 && <div className="w-px flex-1 bg-zinc-800" />}
                </div>
                {/* Content */}
                <div className="pb-8 flex-1">
                  <div className="p-4 sm:p-5 rounded-xl bg-dark-card border border-dark-border">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-zinc-600">{item.step}</span>
                      <span className={`text-sm font-semibold ${item.textClass}`}>{item.agent}</span>
                    </div>
                    <p className="text-zinc-300 text-sm">{item.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Real stat callout */}
          <div className="mt-4 p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
            <p className="text-green-400 font-medium text-sm">
              Full correction cycle completed in 24 minutes on the Tressoldi dataset
            </p>
            <p className="text-zinc-500 text-xs mt-1">Automatic error detection, correction, and re-analysis — no human intervention required</p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ==================== HOW IT ACTUALLY WORKS ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">How It Actually Works</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">
              A <span className="gradient-text">$50/month</span> autonomous research lab
            </p>
            <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
              25 AI agents run on a Raspberry Pi 5, each with a distinct research domain and Greek mythology identity.
              They work on cron schedules, not always-on — cost efficiency by design.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Raspberry Pi 5</h3>
              <p className="text-zinc-400 text-sm">25 agents, $50/month total cost. 15-minute timeout per run prevents runaway spend.</p>
            </div>

            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Brave Search</h3>
              <p className="text-zinc-400 text-sm">Web research across academic databases, preprints, and open-access journals.</p>
            </div>

            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">173K+ Records</h3>
              <p className="text-zinc-400 text-sm">Local datasets across all domains. LanceDB vector memory so agents remember past work.</p>
            </div>

            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Adversarial Review</h3>
              <p className="text-zinc-400 text-sm">Every finding gets skeptic audit. {stats.findings.rejectionRate}% rejection rate proves the bar is real.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ==================== LIVE STATS ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">Live Data</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Research Output</p>
          </div>

          {/* Primary Stats Row — Agent Findings */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-brand-900/10 border border-brand-500/20 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-brand-400 mb-1">{stats.findings.total.toLocaleString()}</div>
              <div className="text-zinc-400 font-medium text-sm">Findings</div>
              <div className="text-xs text-zinc-500 mt-1">Total agent output</div>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-green-900/10 border border-green-500/20 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-green-400 mb-1">{stats.findings.approved.toLocaleString()}</div>
              <div className="text-zinc-400 font-medium text-sm">Approved</div>
              <div className="text-xs text-zinc-500 mt-1">Passed human review</div>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-red-900/10 border border-red-500/20 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-red-400 mb-1">{stats.findings.rejectionRate}%</div>
              <div className="text-zinc-400 font-medium text-sm">Rejection Rate</div>
              <div className="text-xs text-zinc-500 mt-1">Rigor, not failure</div>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-cyan-900/10 border border-cyan-500/20 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-cyan-400 mb-1">{stats.findings.agents}</div>
              <div className="text-zinc-400 font-medium text-sm">Active Agents</div>
              <div className="text-xs text-zinc-500 mt-1">Autonomous researchers</div>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-amber-900/10 border border-amber-500/20 text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">{stats.patterns}</div>
              <div className="text-zinc-400 font-medium text-sm">Patterns Found</div>
              <div className="text-xs text-zinc-500 mt-1">Cross-domain correlations</div>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-green-900/10 border border-green-500/20 text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">{stats.predictions.total}</div>
              <div className="text-zinc-400 font-medium text-sm">Predictions Tracked</div>
              <div className="text-xs text-zinc-500 mt-1">
                {stats.predictions.confirmed > 0 && <span className="text-green-400">{stats.predictions.confirmed} confirmed</span>}
                {stats.predictions.confirmed > 0 && (stats.predictions.testing > 0 || stats.predictions.open > 0) && ' · '}
                {stats.predictions.testing > 0 && <span>{stats.predictions.testing} testing</span>}
                {stats.predictions.testing > 0 && stats.predictions.open > 0 && ' · '}
                {stats.predictions.open > 0 && <span>{stats.predictions.open} open</span>}
                {stats.predictions.total === 0 && 'Awaiting hypotheses'}
              </div>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-purple-900/10 border border-purple-500/20 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">{stats.investigations.total.toLocaleString()}</div>
              <div className="text-zinc-400 font-medium text-sm">Investigations</div>
              <div className="text-xs text-zinc-500 mt-1">{stats.investigations.research} research · {stats.investigations.exploratory.toLocaleString()} exploratory</div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ==================== LIVE AGENT FEED ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold">Live Agent Feed</h2>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Latest Findings</p>
          </div>

          <div className="space-y-3">
            {activity.findings.map((finding) => {
              const confidence = Number(finding.confidence) || 0;
              const confidenceColor = confidence >= 0.7 ? 'bg-green-400' : confidence >= 0.4 ? 'bg-amber-400' : 'bg-red-400';
              const statusColor = finding.review_status === 'approved'
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : finding.review_status === 'rejected'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

              return (
                <div
                  key={finding.id}
                  className="flex items-start gap-4 p-5 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all"
                >
                  {/* Agent avatar */}
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-400 font-bold text-sm uppercase">{finding.agent_id.slice(0, 2)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Agent name + timestamp */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-brand-400 font-semibold text-sm capitalize">{finding.agent_id}</span>
                      <span className="text-zinc-600 text-xs">
                        {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Finding title */}
                    <p className="text-zinc-200 text-sm line-clamp-1 mb-2">{finding.title}</p>

                    {/* Confidence bar + status pill */}
                    <div className="flex items-center gap-3">
                      {/* Confidence */}
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className={`h-full rounded-full ${confidenceColor}`} style={{ width: `${confidence * 100}%` }} />
                        </div>
                        <span className="text-xs text-zinc-500">{(confidence * 100).toFixed(0)}%</span>
                      </div>

                      {/* Status pill */}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {finding.review_status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-6 mt-8">
            <Link
              href="/agent-review"
              className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              View all findings
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/predictions"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-300 font-medium transition-colors"
            >
              Predictions
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CALL TO ACTION ==================== */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-brand-900/20 to-[#0a0a0f]" />
        <div className="absolute inset-0 grid-background opacity-50" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-100 mb-6">
            Have Data You Can&apos;t Publish?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            We provide the infrastructure. You keep control. Your career stays protected.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl text-lg transition-all hover:shadow-2xl hover:shadow-brand-600/30 hover:-translate-y-1"
          >
            Become a Data Custodian
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-dark-border bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-accent-blue flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="font-semibold text-zinc-100 text-lg">Project Aletheia</span>
              </div>
              <p className="text-zinc-500 text-sm mb-4 max-w-sm">
                Built for rigorous curiosity. Open science infrastructure for phenomena that deserve serious study.
              </p>
              <a
                href="https://github.com/0100001001101111/project-aletheia"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                View on GitHub
              </a>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-zinc-100 mb-4">Research</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/predictions" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    Predictions
                  </Link>
                </li>
                <li>
                  <Link href="/patterns" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    Patterns
                  </Link>
                </li>
                <li>
                  <Link href="/investigations" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    Investigations
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-100 mb-4">Contribute</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/submit" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    Submit Data
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/methodology" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                    Methodology
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-dark-border mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-zinc-500 text-sm">
                &copy; {new Date().getFullYear()} Project Aletheia. Built for rigorous curiosity.
              </p>
              <a
                href="https://orcid.org/0009-0002-7449-5459"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M128,0C57.3,0,0,57.3,0,128s57.3,128,128,128s128-57.3,128-128S198.7,0,128,0z M86.3,186.2H70.9V79.1h15.4V186.2z M78.6,70.6c-5.7,0-10.3-4.6-10.3-10.3s4.6-10.3,10.3-10.3c5.7,0,10.3,4.6,10.3,10.3S84.3,70.6,78.6,70.6z M185.1,186.2h-15.4 v-52c0-15.2-5.4-25.6-19.1-25.6c-10.4,0-16.6,7-19.3,13.8c-1,2.4-1.2,5.8-1.2,9.2v54.6h-15.4c0,0,0.2-88.6,0-97.8h15.4v13.8 c2-3.1,5.6-7.6,13.7-7.6c0,0,0,0,0,0c0,0,0,0,0,0c20,0,41.3,13.1,41.3,41.2V186.2z" />
                </svg>
                ORCID
              </a>
            </div>
            <p className="text-zinc-600 text-xs">
              &quot;ἀλήθεια&quot; — Greek for truth, unconcealment
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
