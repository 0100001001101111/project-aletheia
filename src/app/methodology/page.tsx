/**
 * Methodology Page - Research Standards & Trust Architecture
 */

import Link from 'next/link';
import { Navigation } from '@/components/layout/Navigation';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-zinc-100 mb-4">Methodology</h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Rigorous standards, transparent processes, and built-in skepticism.
            </p>
          </div>

          {/* Two-Tier Data Architecture */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Two-Tier Data Architecture</h2>
            <p className="text-zinc-400 mb-6">
              We maintain strict separation between research-grade and exploratory data.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔬</span>
                  <h3 className="text-lg font-semibold text-emerald-400">Research Tier</h3>
                </div>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li>• Quality-scored investigations (1-10 scale)</li>
                  <li>• Structured schemas with validation</li>
                  <li>• Supports falsifiable predictions</li>
                  <li>• Used for statistical analysis</li>
                  <li>• ~185 curated records</li>
                </ul>
              </div>
              <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-lg font-semibold text-amber-400">Pattern Analysis Tier</h3>
                </div>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li>• Bulk-imported sighting reports</li>
                  <li>• Not quality-scored</li>
                  <li>• Geographic clustering only</li>
                  <li>• Does not support scientific claims</li>
                  <li>• ~174,000 exploratory records</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Quality Scoring */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Quality Scoring Matrix</h2>
            <p className="text-zinc-400 mb-6">
              Research-tier investigations are scored 1-10 across multiple dimensions.
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-700">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-300">Factor</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-300">Weight</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-300">Criteria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  <tr>
                    <td className="px-4 py-3 text-zinc-100">Documentation</td>
                    <td className="px-4 py-3 text-zinc-400">25%</td>
                    <td className="px-4 py-3 text-zinc-400">Timestamps, sources, chain of custody</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-zinc-100">Verification</td>
                    <td className="px-4 py-3 text-zinc-400">25%</td>
                    <td className="px-4 py-3 text-zinc-400">Independent corroboration, witness credibility</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-zinc-100">Methodology</td>
                    <td className="px-4 py-3 text-zinc-400">20%</td>
                    <td className="px-4 py-3 text-zinc-400">Controls, blinding, sample size</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-zinc-100">Completeness</td>
                    <td className="px-4 py-3 text-zinc-400">15%</td>
                    <td className="px-4 py-3 text-zinc-400">Required fields, contextual data</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-zinc-100">Reproducibility</td>
                    <td className="px-4 py-3 text-zinc-400">15%</td>
                    <td className="px-4 py-3 text-zinc-400">Can the test be repeated? Data available?</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Agent Workflow */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Agent Research Pipeline</h2>
            <p className="text-zinc-400 mb-6">
              How our AI agents discover and validate findings.
            </p>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Pattern Scanning', desc: 'Agents scan for correlations across 6 research domains using statistical methods.' },
                { step: '2', title: 'Hypothesis Generation', desc: 'Claude API generates testable hypotheses from detected patterns.' },
                { step: '3', title: 'Holdout Validation', desc: 'Hypotheses tested against held-back data (30% holdout) using Chi-squared and permutation tests.' },
                { step: '4', title: 'Confound Checking', desc: 'Check for reporting bias, population density effects, temporal clustering, geographic confounds.' },
                { step: '5', title: 'Human Review', desc: 'Findings with >70% confidence enter review queue for human approval or rejection.' },
                { step: '6', title: 'Prediction Creation', desc: 'Approved findings become falsifiable predictions with testing protocols.' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{item.step}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100">{item.title}</h3>
                    <p className="text-sm text-zinc-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-300">
                <span className="font-medium">Epistemic Humility:</span> All agent confidence scores are capped at 85%.
                Agents are trained to acknowledge uncertainty and flag their own limitations.
              </p>
            </div>
          </section>

          {/* Trust Architecture */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Trust Architecture</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔒</span>
                  <h3 className="text-lg font-semibold text-zinc-100">Pre-Registration</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Lock in methodology before testing. Hash-sealed predictions prevent p-hacking and HARKing.
                </p>
                <ul className="space-y-1 text-xs text-zinc-500">
                  <li>• SHA-256 hash of hypothesis + protocol</li>
                  <li>• Timestamped before data collection</li>
                  <li>• Public registry of predictions</li>
                </ul>
              </div>
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🛡️</span>
                  <h3 className="text-lg font-semibold text-zinc-100">Red Team System</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Built-in skepticism. Anyone can flag methodology flaws, confounds, or alternative explanations.
                </p>
                <ul className="space-y-1 text-xs text-zinc-500">
                  <li>• Public flaw flagging with categories</li>
                  <li>• Credibility-weighted voting</li>
                  <li>• Mandatory response from researchers</li>
                </ul>
              </div>
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">⚖️</span>
                  <h3 className="text-lg font-semibold text-zinc-100">Jury System</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Disputed results go to randomly selected jurors with relevant expertise.
                </p>
                <ul className="space-y-1 text-xs text-zinc-500">
                  <li>• 5-person juries per dispute</li>
                  <li>• Domain-matched expertise</li>
                  <li>• Binding decisions on data quality</li>
                </ul>
              </div>
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-lg font-semibold text-zinc-100">Brier Scores</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Track prediction accuracy over time. Calibration matters more than being right.
                </p>
                <ul className="space-y-1 text-xs text-zinc-500">
                  <li>• Score = (probability - outcome)²</li>
                  <li>• Lower is better (0 = perfect)</li>
                  <li>• Public leaderboard of predictors</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Statistical Standards */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Statistical Standards</h2>
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <ul className="space-y-3 text-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="text-brand-400">•</span>
                  <span><strong>Alpha = 0.01:</strong> We use stricter significance thresholds than typical p &lt; 0.05</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-400">•</span>
                  <span><strong>Effect sizes required:</strong> Statistical significance without practical significance is meaningless</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-400">•</span>
                  <span><strong>Multiple comparison correction:</strong> Bonferroni or FDR adjustment for all multi-test analyses</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-400">•</span>
                  <span><strong>Power analysis:</strong> Minimum 80% power required before data collection</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-400">•</span>
                  <span><strong>Replication tracking:</strong> All findings tracked for replication attempts and success rates</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Links */}
          <section className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/about"
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors"
            >
              About Aletheia
            </Link>
            <Link
              href="/predictions"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg transition-colors"
            >
              View Predictions
            </Link>
            <Link
              href="/preregister"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg transition-colors"
            >
              Pre-Register Study
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
