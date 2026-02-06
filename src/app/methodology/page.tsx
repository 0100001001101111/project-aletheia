'use client';

/**
 * Methodology Page
 * Explains how the platform works, data sources, quality scoring, and limitations.
 * Created in response to researcher feedback (Peter Bancel, Institut Metapsychique International).
 */

import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';

const QUALITY_ROWS = [
  {
    category: 'Isolation',
    high: 'Double-blind, separate buildings',
    moderate: 'Single-blind, separate rooms',
    low: 'Same room',
    fail: 'Direct contact possible',
  },
  {
    category: 'Target Selection',
    high: 'Machine randomized',
    moderate: 'Third party randomized',
    low: 'Subjective choice',
    fail: 'Predictable sequence',
  },
  {
    category: 'Data Integrity',
    high: 'Raw data uploaded',
    moderate: 'Detailed notes',
    low: 'Summary only',
    fail: 'Hearsay',
  },
  {
    category: 'Baseline',
    high: 'Null trials documented',
    moderate: 'Informal baseline',
    low: 'None recorded',
    fail: 'No concept of chance',
  },
];

function SectionHeading({ id, number, title }: { id: string; number: number; title: string }) {
  return (
    <h2 id={id} className="text-2xl font-bold text-zinc-100 mb-4 scroll-mt-24">
      <span className="text-brand-400 mr-2">{number}.</span>
      {title}
    </h2>
  );
}

export default function MethodologyPage() {
  return (
    <PageWrapper
      title="Methodology"
      description="How the platform works, where the data comes from, and what the quality scores mean."
    >
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Table of contents */}
        <nav className="rounded-xl border border-dark-border bg-dark-card p-6">
          <h3 className="text-sm uppercase tracking-wider text-zinc-500 font-semibold mb-3">On this page</h3>
          <ol className="space-y-1.5 text-sm">
            {[
              ['platform', 'What This Platform Does'],
              ['sources', 'Data Sources'],
              ['scoring', 'Quality Scoring'],
              ['statistics', 'Domain-Specific Statistics'],
              ['limitations', 'What the Platform Does NOT Have'],
              ['agents', 'AI Agent System'],
              ['questions', 'Open Questions'],
            ].map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="text-zinc-400 hover:text-brand-400 transition-colors">
                  <span className="text-zinc-600 mr-2">{i + 1}.</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Section 1 */}
        <section>
          <SectionHeading id="platform" number={1} title="What This Platform Does" />
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p>
              Project Aletheia aggregates existing anomaly research data across five
              domains&mdash;Ganzfeld telepathy, near-death experiences, crisis apparitions,
              remote viewing, and geophysical correlations&mdash;into a standardized format.
              AI agents run cross-domain pattern analysis. Humans can also submit new results.
            </p>
            <p>
              The platform does not conduct experiments. It structures published data and
              applies consistent quality standards so records from different domains can be
              compared.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <SectionHeading id="sources" number={2} title="Data Sources" />
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p>The 19,000+ records were bulk-imported from:</p>
            <ul className="space-y-3 ml-1">
              {[
                'Ganzfeld trials from published meta-analyses (Bem & Honorton 1994, Storm et al. 2010, etc.)',
                'Declassified STARGATE remote viewing sessions',
                'NDE cases from publicly available NDERF narratives and published prospective studies (van Lommel 2001, Greyson, Parnia AWARE)',
                'Crisis apparition reports from Society for Psychical Research historical records (Phantasms of the Living, etc.)',
                'USGS seismic data and geological surveys for the geophysical layer',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-brand-400 mt-0.5 shrink-0">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>New data can be submitted through the platform by researchers or the public.</p>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <SectionHeading id="scoring" number={3} title="Quality Scoring" />
          <div className="space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Every record gets a quality score from 0&ndash;10 using multiplicative scoring
              across four categories:
            </p>

            <div className="overflow-x-auto rounded-xl border border-dark-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900/70 border-b border-dark-border">
                    <th className="px-4 py-3 text-left text-zinc-400 font-medium">Category</th>
                    <th className="px-4 py-3 text-left text-emerald-400 font-medium">1.0 (High)</th>
                    <th className="px-4 py-3 text-left text-amber-400 font-medium">0.5 (Moderate)</th>
                    <th className="px-4 py-3 text-left text-orange-400 font-medium">0.1 (Low)</th>
                    <th className="px-4 py-3 text-left text-red-400 font-medium">0.0 (Fail)</th>
                  </tr>
                </thead>
                <tbody>
                  {QUALITY_ROWS.map((row, i) => (
                    <tr
                      key={row.category}
                      className={`border-b border-dark-border last:border-b-0 ${
                        i % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/10'
                      }`}
                    >
                      <td className="px-4 py-3 text-zinc-200 font-medium">{row.category}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.high}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.moderate}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.low}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.fail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-dark-border bg-dark-card p-5 space-y-3">
              <p className="text-zinc-200 font-medium">
                Formula:{' '}
                <code className="text-brand-400 bg-zinc-800 px-2 py-0.5 rounded text-sm">
                  Total = Isolation &times; Target &times; Data &times; Baseline &times; 10
                </code>
              </p>
              <p className="text-zinc-400 text-sm">
                If any category scores 0.0, the total is automatically 0. You cannot
                compensate for a fatal flaw in one area with strength in another.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-zinc-200">Tiers</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="text-emerald-400 font-semibold mb-1">8&ndash;10: Verified</div>
                  <p className="text-zinc-400 text-sm">Counts toward prediction testing</p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="text-amber-400 font-semibold mb-1">4&ndash;7: Provisional</div>
                  <p className="text-zinc-400 text-sm">Visible in community findings only</p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                  <div className="text-red-400 font-semibold mb-1">Below 4: Rejected</div>
                  <p className="text-zinc-400 text-sm">User gets specific feedback on what to improve</p>
                </div>
              </div>
              <p className="text-zinc-500 text-sm italic">
                &ldquo;Verified&rdquo; means the methodology passed quality checks. It does
                not mean the phenomenon itself is verified.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <SectionHeading id="statistics" number={4} title="Domain-Specific Statistics" />
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p>Different domains use different statistical methods:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  domain: 'Ganzfeld & STARGATE',
                  method: 'Binomial distribution, Z-score (25% chance expectation for 4-choice)',
                  color: 'border-purple-500/30',
                },
                {
                  domain: 'Geophysical',
                  method: 'Poisson distribution, cross-correlation with seismic events',
                  color: 'border-green-500/30',
                },
                {
                  domain: 'NDE',
                  method: 'Greyson Scale scoring, veridicality assessment',
                  color: 'border-cyan-500/30',
                },
                {
                  domain: 'Crisis Apparitions',
                  method: 'Time-synchronization probability, documentation delay',
                  color: 'border-pink-500/30',
                },
              ].map((item) => (
                <div key={item.domain} className={`rounded-lg border ${item.color} bg-zinc-900/30 p-4`}>
                  <div className="text-zinc-200 font-medium mb-1">{item.domain}</div>
                  <p className="text-zinc-400 text-sm">{item.method}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <SectionHeading id="limitations" number={5} title="What the Platform Does NOT Have" />
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p>Being transparent about limitations:</p>
            <ul className="space-y-3 ml-1">
              {[
                'No raw mentation transcripts from Ganzfeld sessions (trial-level outcomes only)',
                'No direct access to private institutional databases',
                'Quality scores are based on published methodology descriptions, not independent replication',
                'Cross-domain patterns are correlational, not causal',
                'This is a solo-built research tool, not an institutional lab',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-zinc-600 mt-0.5 shrink-0">&mdash;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <SectionHeading id="agents" number={6} title="AI Agent System" />
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p>
              20 autonomous agents analyze data across domains. Agents submit findings to a
              human review queue. Findings are approved or rejected manually. Agents learn
              from rejections through feedback loops.
            </p>
            <p>
              The agents search published literature, check for cross-domain patterns, and
              flag statistical anomalies. They do not conduct experiments or generate data.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section>
          <SectionHeading id="questions" number={7} title="Open Questions" />
          <div className="space-y-4 text-zinc-300 leading-relaxed">
            <p>
              The core question being tested: do stress-response patterns appear consistently
              across unrelated domains, or does each domain have independent drivers?
            </p>
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-5">
              <p className="text-zinc-200">
                This is falsifiable. If anomalous reports do not cluster around high-stress
                periods more than low-stress periods after controlling for reporting bias,
                the hypothesis fails.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom links */}
        <section className="flex flex-wrap gap-4 pt-4">
          <Link
            href="/investigations"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-all hover:-translate-y-0.5"
          >
            Browse Research
          </Link>
          <Link
            href="/predictions"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-lg transition-all hover:-translate-y-0.5"
          >
            View Predictions
          </Link>
          <Link
            href="/submit"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-lg transition-all hover:-translate-y-0.5"
          >
            Submit Data
          </Link>
        </section>
      </div>
    </PageWrapper>
  );
}
