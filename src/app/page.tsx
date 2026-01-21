/**
 * Project Aletheia - Landing Page
 * Rigorous Infrastructure for Anomaly Research
 */

import Link from 'next/link';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Domain configuration
const DOMAINS = [
  {
    id: 'nde',
    name: 'NDE',
    fullName: 'Near-Death Experiences',
    description: 'Veridical perceptions during clinical death',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: 'cyan',
    gradient: 'from-cyan-500 to-cyan-400',
  },
  {
    id: 'ganzfeld',
    name: 'Ganzfeld',
    fullName: 'Psi Experiments',
    description: 'Controlled telepathy and remote perception studies',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: 'purple',
    gradient: 'from-purple-500 to-purple-400',
  },
  {
    id: 'crisis_apparition',
    name: 'Crisis',
    fullName: 'Crisis Apparitions',
    description: 'Spontaneous perception of distant death or danger',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    color: 'pink',
    gradient: 'from-pink-500 to-pink-400',
  },
  {
    id: 'stargate',
    name: 'STARGATE',
    fullName: 'Remote Viewing',
    description: 'Declassified government remote perception research',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    color: 'orange',
    gradient: 'from-orange-500 to-orange-400',
  },
  {
    id: 'geophysical',
    name: 'Geophysical',
    fullName: 'Earth Anomalies',
    description: 'Earthquake lights and environmental correlates',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'green',
    gradient: 'from-green-500 to-green-400',
  },
  {
    id: 'ufo',
    name: 'UFO/UAP',
    fullName: 'Unidentified Aerial Phenomena',
    description: 'Aerial anomalies with witness reports and correlations',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c-4.97 0-9 2.686-9 6 0 2.21 2.015 4.134 5 5.197V17l2.5-2.5L13 17v-2.803c2.985-1.063 5-2.987 5-5.197 0-3.314-4.03-6-9-6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9h.01M15 9h.01M12 21v-4" />
      </svg>
    ),
    color: 'rose',
    gradient: 'from-rose-500 to-rose-400',
  },
];

// Fetch stats from database
async function getStats() {
  try {
    const supabase = await createServerClient();

    // Get total investigation count efficiently
    const { count: totalInvestigations } = await supabase
      .from('aletheia_investigations')
      .select('id', { count: 'exact', head: true });

    // Get counts by type using individual count queries (more efficient than fetching all rows)
    const [ndeCount, ganzfeldCount, crisisCount, stargateCount, geophysicalCount, ufoCount] = await Promise.all([
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'nde'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'ganzfeld'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'crisis_apparition'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'stargate'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'geophysical'),
      supabase.from('aletheia_investigations').select('id', { count: 'exact', head: true }).eq('investigation_type', 'ufo'),
    ]);

    const investigationCounts = {
      nde: ndeCount.count || 0,
      ganzfeld: ganzfeldCount.count || 0,
      crisis: crisisCount.count || 0,
      stargate: stargateCount.count || 0,
      geophysical: geophysicalCount.count || 0,
      ufo: ufoCount.count || 0,
      total: totalInvestigations || 0,
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

    return {
      investigations: investigationCounts,
      patterns: patternCount || 0,
      predictions: predictionStats,
    };
  } catch {
    return {
      investigations: { nde: 0, ganzfeld: 0, crisis: 0, stargate: 0, geophysical: 0, ufo: 0, total: 0 },
      patterns: 0,
      predictions: { total: 0, confirmed: 0, refuted: 0, testing: 0, open: 0 },
    };
  }
}

// Fetch recent activity
async function getRecentActivity() {
  try {
    const supabase = await createServerClient();

    // Get recent patterns
    const { data: recentPatterns } = await supabase
      .from('aletheia_pattern_matches')
      .select('id, pattern_description, confidence_score, created_at')
      .order('created_at', { ascending: false })
      .limit(3) as { data: Array<{ id: string; pattern_description: string; confidence_score: number; created_at: string }> | null };

    // Get recent predictions
    const { data: recentPredictions } = await supabase
      .from('aletheia_predictions')
      .select('id, hypothesis, status, resolved_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5) as { data: Array<{ id: string; hypothesis: string; status: string; resolved_at: string | null; created_at: string }> | null };

    return {
      patterns: recentPatterns || [],
      predictions: recentPredictions || [],
    };
  } catch {
    return { patterns: [], predictions: [] };
  }
}

// Fetch predictions being tested
async function getTestingPredictions() {
  try {
    const supabase = await createServerClient();

    const { data } = await supabase
      .from('aletheia_predictions')
      .select('id, hypothesis, confidence_score, domains_involved')
      .eq('status', 'testing')
      .order('confidence_score', { ascending: false })
      .limit(3) as { data: Array<{ id: string; hypothesis: string; confidence_score: number; domains_involved: string[] }> | null };

    return data || [];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const stats = await getStats();
  const activity = await getRecentActivity();
  const testingPredictions = await getTestingPredictions();

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* ==================== HEADER ==================== */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-brand-900/30 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-accent-blue flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="font-semibold text-zinc-100 text-lg">Aletheia</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                Dashboard
              </Link>
              <Link href="/predictions" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                Predictions
              </Link>
              <Link href="/patterns" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                Patterns
              </Link>
              <Link href="/investigations" className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                Investigations
              </Link>
              <Link
                href="/submit"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-brand-600/25"
              >
                Submit Data
              </Link>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-zinc-400 hover:text-zinc-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient grid-background">
        {/* Decorative orbs */}
        <div className="orb orb-purple w-96 h-96 -top-48 -left-48" />
        <div className="orb orb-blue w-64 h-64 top-1/3 -right-32" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-brand-300 text-sm font-medium">Cross-Domain Research Platform</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-zinc-100 mb-6 leading-tight">
            Project <span className="gradient-text">Aletheia</span>
          </h1>

          {/* Subhead */}
          <p className="text-xl sm:text-2xl text-zinc-300 font-light mb-4">
            Rigorous Infrastructure for Anomaly Research
          </p>

          {/* Tagline */}
          <p className="text-lg text-brand-400 font-medium mb-12">
            We don&apos;t chase ghosts. We find patterns.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5"
            >
              Explore Findings
            </Link>
            <Link
              href="/submit"
              className="px-8 py-4 border border-brand-500/30 hover:border-brand-500/60 text-brand-300 hover:text-white font-semibold rounded-xl transition-all hover:bg-brand-500/10"
            >
              Become a Custodian
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

      {/* ==================== THE SOLUTION ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">The Solution</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">
              <span className="gradient-text">GitHub</span> for Anomaly Research
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Standardized Schemas</h3>
              <p className="text-zinc-400 text-sm">6 research domains, machine-readable formats, version controlled</p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Cross-Domain Patterns</h3>
              <p className="text-zinc-400 text-sm">AI finds connections humans miss across seemingly unrelated fields</p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Falsifiable Predictions</h3>
              <p className="text-zinc-400 text-sm">Tracked publicly, updated live, scored by Brier method</p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Anonymous Options</h3>
              <p className="text-zinc-400 text-sm">Contribute without career risk. Your data, your control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ==================== CORE HYPOTHESIS ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0a0f] to-[#0d0d14]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">The Core Hypothesis</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
              Stress Produces Signal — <span className="gradient-text">At Every Scale</span>
            </p>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              From individual neurons to planetary systems, extreme stress may trigger information transfer through
              unknown channels.
            </p>
          </div>

          {/* Scale Table */}
          <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border bg-brand-500/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-brand-300">Scale</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-brand-300">System</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-brand-300">Stressor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-brand-300">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                <tr className="hover:bg-brand-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-cyan-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      Micro
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">Neuron</td>
                  <td className="px-6 py-4 text-zinc-400">Death / Trauma</td>
                  <td className="px-6 py-4 text-zinc-300">NDE veridicality</td>
                </tr>
                <tr className="hover:bg-brand-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-purple-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Meso
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">Human</td>
                  <td className="px-6 py-4 text-zinc-400">Crisis / Grief</td>
                  <td className="px-6 py-4 text-zinc-300">Apparitions</td>
                </tr>
                <tr className="hover:bg-brand-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-green-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      Macro
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">Planet</td>
                  <td className="px-6 py-4 text-zinc-400">Seismic pressure</td>
                  <td className="px-6 py-4 text-zinc-300">UAP / EQ lights</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================== LIVE STATS ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">Live Data</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Current State of Research</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Investigations */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-brand-900/10 border border-brand-500/20 text-center">
              <div className="text-5xl font-bold gradient-text mb-2">{stats.investigations.total}</div>
              <div className="text-zinc-400 font-medium">Investigations</div>
              <div className="text-xs text-zinc-500 mt-1">Across all domains</div>
            </div>

            {/* Patterns */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-purple-900/10 border border-purple-500/20 text-center">
              <div className="text-5xl font-bold text-purple-400 mb-2">{stats.patterns}</div>
              <div className="text-zinc-400 font-medium">Patterns Found</div>
              <div className="text-xs text-zinc-500 mt-1">Cross-domain correlations</div>
            </div>

            {/* Predictions */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-green-900/10 border border-green-500/20 text-center">
              <div className="text-5xl font-bold text-green-400 mb-2">
                {stats.predictions.confirmed}
                <span className="text-2xl text-zinc-500">/{stats.predictions.total}</span>
              </div>
              <div className="text-zinc-400 font-medium">Predictions</div>
              <div className="text-xs text-zinc-500 mt-1">Confirmed / Total</div>
            </div>

            {/* Domains */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-dark-card to-cyan-900/10 border border-cyan-500/20 text-center">
              <div className="text-5xl font-bold text-cyan-400 mb-2">{DOMAINS.length}</div>
              <div className="text-zinc-400 font-medium">Domains</div>
              <div className="text-xs text-zinc-500 mt-1">Connected schemas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ==================== RECENT ACTIVITY ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">Recent Activity</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Latest Developments</p>
          </div>

          <div className="space-y-4">
            {activity.predictions.slice(0, 5).map((prediction) => (
              <div
                key={prediction.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    prediction.status === 'confirmed'
                      ? 'bg-green-500/10'
                      : prediction.status === 'refuted'
                        ? 'bg-red-500/10'
                        : prediction.status === 'testing'
                          ? 'bg-amber-500/10'
                          : 'bg-brand-500/10'
                  }`}
                >
                  {prediction.status === 'confirmed' ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : prediction.status === 'refuted' ? (
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : prediction.status === 'testing' ? (
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm line-clamp-2">{prediction.hypothesis}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        prediction.status === 'confirmed'
                          ? 'status-confirmed'
                          : prediction.status === 'refuted'
                            ? 'status-refuted'
                            : prediction.status === 'testing'
                              ? 'status-testing'
                              : 'status-open'
                      }`}
                    >
                      {prediction.status}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(prediction.resolved_at || prediction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/predictions"
              className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              View all predictions
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== THE 5 DOMAINS ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0a0f] to-[#0d0d14]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">Research Domains</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Six Interconnected Fields</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {DOMAINS.map((domain) => (
              <Link
                key={domain.id}
                href={`/investigations?domain=${domain.id}`}
                className="group p-6 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/30 transition-all hover:-translate-y-1"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${domain.gradient} bg-opacity-10 flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}
                  style={{ background: `linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))` }}
                >
                  <span className={`text-${domain.color}-400`}>{domain.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-1">{domain.name}</h3>
                <p className="text-sm text-zinc-500 mb-2">{domain.fullName}</p>
                <p className="text-xs text-zinc-500 line-clamp-2">{domain.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ==================== PREDICTIONS SPOTLIGHT ==================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-4">Currently Testing</h2>
            <p className="text-3xl sm:text-4xl font-bold text-zinc-100">Predictions Under Investigation</p>
          </div>

          <div className="space-y-6">
            {testingPredictions.length > 0 ? (
              testingPredictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="p-6 rounded-xl bg-dark-card border border-amber-500/20 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="text-zinc-200 leading-relaxed">{prediction.hypothesis}</p>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-2xl font-bold text-amber-400">
                        {Math.round((prediction.confidence_score || 0) * 100)}%
                      </div>
                      <div className="text-xs text-zinc-500">Confidence</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {prediction.domains_involved?.map((domain: string) => (
                        <span key={domain} className="text-xs px-2 py-1 rounded bg-brand-500/10 text-brand-300">
                          {domain}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/predictions/${prediction.id}`}
                      className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
                    >
                      Help test this →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500">No predictions currently being tested.</div>
            )}
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
                href="https://github.com/project-aletheia"
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
            <p className="text-zinc-500 text-sm">
              &copy; {new Date().getFullYear()} Project Aletheia. Built for rigorous curiosity.
            </p>
            <p className="text-zinc-600 text-xs">
              &quot;ἀλήθεια&quot; — Greek for truth, unconcealment
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
