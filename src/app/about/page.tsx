/**
 * About Page - Aletheia Research Platform
 */

import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';

const AGENTS = [
  {
    name: 'Argus',
    emoji: '👁️',
    role: 'Continuous Monitoring',
    description: 'Watches data streams 24/7, flagging new submissions for review and detecting anomalies in real-time.',
  },
  {
    name: 'Deep Miner',
    emoji: '⛏️',
    role: 'Statistical Analysis',
    description: 'Exhaustive within-domain analysis: variable census, cross-tabulations, subgroup breakdowns, temporal stability.',
  },
  {
    name: 'Discovery',
    emoji: '🔍',
    role: 'Literature Hunting',
    description: 'Monitors 28+ sources (journals, archives, preprints) and tracks 24 researchers for new publications.',
  },
  {
    name: 'Connection',
    emoji: '🔗',
    role: 'Cross-Domain Patterns',
    description: 'Maps variables across domains, finds correlations, tests Keel hypothesis ("weird stuff correlates").',
  },
  {
    name: 'Mechanism',
    emoji: '⚙️',
    role: 'Theory Testing',
    description: 'Catalogs proposed mechanisms, designs discriminating tests, builds unified theories with parsimony scoring.',
  },
  {
    name: 'Synthesis',
    emoji: '📊',
    role: 'Report Generation',
    description: 'Creates domain deep-dives, cross-domain syntheses, and audience-specific research briefs.',
  },
  {
    name: 'Flora',
    emoji: '🌿',
    role: 'Quality Control',
    description: 'Reviews agent findings, checks for methodology flaws, ensures epistemic humility in all outputs.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-blue flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <h1 className="text-4xl font-bold text-zinc-100 mb-4">About Aletheia</h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Autonomous research infrastructure for rigorous investigation of anomalous phenomena.
            </p>
          </div>

          {/* Mission */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Our Mission</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-zinc-300 leading-relaxed">
                Aletheia is building the infrastructure for scientific investigation of anomalous phenomena.
                We combine autonomous AI agents, rigorous methodology, and transparent governance to ask
                the questions mainstream science often avoids—while maintaining the epistemic standards
                that make answers meaningful.
              </p>
              <p className="text-zinc-300 leading-relaxed mt-4">
                Our core hypothesis: <span className="text-brand-400 font-medium">Stress produces signal—at every scale.</span> From
                neurons under trauma to planets under seismic pressure, we investigate whether extreme stress
                triggers information transfer through unknown channels.
              </p>
            </div>
          </section>

          {/* Agent Swarm */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">The Agent Swarm</h2>
            <p className="text-zinc-400 mb-8">
              Seven specialized AI agents work around the clock, hunting for patterns humans miss.
              Each agent has a specific role in the research pipeline.
            </p>
            <div className="grid gap-4">
              {AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="text-3xl">{agent.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-zinc-100">{agent.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {agent.role}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">{agent.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Research Domains */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Six Research Domains</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: 'Near-Death Experiences', icon: '💀', focus: 'Veridicality, biological triggers' },
                { name: 'Ganzfeld/Psi', icon: '🧠', focus: 'Information transfer, noise vs signal' },
                { name: 'Crisis Apparitions', icon: '👻', focus: 'Spontaneous transmission events' },
                { name: 'Remote Viewing', icon: '👁️', focus: 'STARGATE data, methodology analysis' },
                { name: 'Geophysical', icon: '🌍', focus: 'Tectonic stress, EM anomalies' },
                { name: 'UFO/UAP', icon: '🛸', focus: 'Correlations with other phenomena' },
              ].map((domain) => (
                <div key={domain.name} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="text-2xl mb-2">{domain.icon}</div>
                  <h3 className="font-medium text-zinc-100 text-sm">{domain.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{domain.focus}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Links */}
          <section className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/methodology"
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors"
            >
              View Methodology
            </Link>
            <Link
              href="/agent"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg transition-colors"
            >
              Explore Agents
            </Link>
            <Link
              href="/investigations"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg transition-colors"
            >
              Browse Research
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
