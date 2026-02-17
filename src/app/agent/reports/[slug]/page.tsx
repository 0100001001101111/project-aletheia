'use client';

/**
 * Agent Research Report Detail Page
 * Displays a full research report with all sections
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import Link from 'next/link';
import type { ReportVerdict, TestResult, ConfoundCheckResult, SearchSource, ResearchQuery, SuggestedContact } from '@/lib/agent/types';

interface Report {
  id: string;
  slug: string;
  title: string;
  display_title: string;
  summary: string;
  statistical_evidence: {
    pattern: string;
    tests: TestResult[];
    confounds: ConfoundCheckResult[];
    interpretation: string;
  } | null;
  research_queries: ResearchQuery[] | null;
  sources: SearchSource[] | null;
  synthesis: string | null;
  conclusion: string | null;
  recommended_actions: string[] | null;
  confidence_initial: number | null;
  confidence_final: number | null;
  verdict: ReportVerdict | null;
  status: string;
  suggested_contacts: SuggestedContact[] | null;
  published_at: string | null;
  created_at: string | null;
  finding?: {
    id: string;
    display_title: string;
    review_status: string;
  };
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  supported: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Supported' },
  refuted: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'Refuted' },
  inconclusive: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Inconclusive' },
  needs_more_data: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Needs More Data' },
};

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-zinc-900/50 flex items-center justify-between hover:bg-zinc-900/70 transition-colors"
      >
        <h3 className="text-lg font-medium text-zinc-200">{title}</h3>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 bg-zinc-900/30">{children}</div>}
    </div>
  );
}

export default function ReportDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/agent/reports/${params.slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Report not found');
          } else {
            throw new Error('Failed to fetch report');
          }
          return;
        }

        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [params.slug]);

  const handlePublish = async () => {
    if (!report) return;

    setIsPublishing(true);
    try {
      const res = await fetch(`/api/agent/reports/${report.slug}/publish`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish');
      }

      // Refresh the report
      const refreshRes = await fetch(`/api/agent/reports/${report.slug}`);
      const refreshData = await refreshRes.json();
      setReport(refreshData.report);
    } catch (err) {
      console.error('Error publishing report:', err);
      alert(err instanceof Error ? err.message : 'Failed to publish report');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !report) {
    return (
      <PageWrapper title="Report Not Found" description="">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-medium text-zinc-300 mb-2">{error || 'Report not found'}</h3>
          <Link
            href="/agent/reports"
            className="inline-block mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium"
          >
            Back to Reports
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const verdict = VERDICT_STYLES[report.verdict || 'inconclusive'] || VERDICT_STYLES.inconclusive;
  const confidenceInitial = Math.round((report.confidence_initial || 0) * 100);
  const confidenceFinal = Math.round((report.confidence_final || 0) * 100);

  return (
    <PageWrapper
      title=""
      description=""
      headerAction={
        <Link
          href="/agent/reports"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
        >
          ← Back to Reports
        </Link>
      }
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
              {report.display_title}
            </h1>
            <p className="text-zinc-500 text-sm">
              {report.published_at
                ? `Published ${new Date(report.published_at).toLocaleDateString()}`
                : `Draft created ${new Date(report.created_at || '').toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full border ${verdict.bg} ${verdict.text} ${verdict.border}`}>
              {verdict.label}
            </span>
            {user && report.status === 'draft' && (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Publish Report'}
              </button>
            )}
          </div>
        </div>

        {/* Confidence meter */}
        <div className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Initial:</span>
            <span className="text-sm text-zinc-300">{confidenceInitial}%</span>
          </div>
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                confidenceFinal >= 70 ? 'bg-emerald-500' :
                confidenceFinal >= 40 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ width: `${confidenceFinal}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Final:</span>
            <span className={`text-sm font-medium ${
              confidenceFinal >= 70 ? 'text-emerald-400' :
              confidenceFinal >= 40 ? 'text-amber-400' :
              'text-red-400'
            }`}>{confidenceFinal}%</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <h2 className="text-lg font-semibold text-zinc-200 mb-3">Summary</h2>
        <div className="text-zinc-300 whitespace-pre-wrap">
          {report.summary}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* The Pattern */}
        <CollapsibleSection title="The Pattern" defaultOpen={true}>
          <p className="text-zinc-400 mb-2">
            <span className="text-zinc-300 font-medium">Technical description:</span>
          </p>
          <p className="text-zinc-300">{report.title}</p>

          {report.finding && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Based on finding:{' '}
                <Link
                  href={`/agent/review/${report.finding.id}`}
                  className="text-brand-400 hover:underline"
                >
                  {report.finding.display_title}
                </Link>
              </p>
            </div>
          )}
        </CollapsibleSection>

        {/* Statistical Evidence */}
        {report.statistical_evidence && (
          <CollapsibleSection title="Statistical Evidence">
            {/* Interpretation */}
            <p className="text-zinc-300 mb-4">{report.statistical_evidence.interpretation}</p>

            {/* Test Results */}
            {report.statistical_evidence.tests && report.statistical_evidence.tests.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Test Results</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500 border-b border-zinc-800">
                        <th className="pb-2 pr-4">Test</th>
                        <th className="pb-2 pr-4">p-value</th>
                        <th className="pb-2 pr-4">Effect Size</th>
                        <th className="pb-2 pr-4">Sample</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.statistical_evidence.tests.map((test, i) => (
                        <tr key={i} className="border-b border-zinc-800/50">
                          <td className="py-2 pr-4 text-zinc-300">{test.test_type}</td>
                          <td className="py-2 pr-4 text-zinc-400">{test.p_value?.toFixed(4) || 'N/A'}</td>
                          <td className="py-2 pr-4 text-zinc-400">{test.effect_size?.toFixed(3) || 'N/A'}</td>
                          <td className="py-2 pr-4 text-zinc-400">{test.sample_size || 'N/A'}</td>
                          <td className="py-2">
                            <span className={test.passed_threshold ? 'text-emerald-400' : 'text-red-400'}>
                              {test.passed_threshold ? '✓ Passed' : '✗ Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Confound Checks */}
            {report.statistical_evidence.confounds && report.statistical_evidence.confounds.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Confound Checks</h4>
                <div className="space-y-2">
                  {report.statistical_evidence.confounds.map((check, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={check.effect_survived ? 'text-emerald-400' : check.controlled ? 'text-red-400' : 'text-zinc-500'}>
                        {check.effect_survived ? '✓' : check.controlled ? '✗' : '○'}
                      </span>
                      <div>
                        <span className="text-zinc-300">{check.confound_type}:</span>{' '}
                        <span className="text-zinc-400">{check.notes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* External Research */}
        <CollapsibleSection title="External Research" defaultOpen={true}>
          {/* Research Queries */}
          {report.research_queries && report.research_queries.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Research Queries</h4>
              <div className="space-y-2">
                {report.research_queries.map((query, i) => (
                  <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        query.type === 'prior_research' ? 'bg-purple-500/20 text-purple-300' :
                        query.type === 'alternative_data' ? 'bg-blue-500/20 text-blue-300' :
                        query.type === 'mechanism' ? 'bg-cyan-500/20 text-cyan-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {query.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">"{query.query}"</p>
                    <p className="text-xs text-zinc-500 mt-1">{query.context}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {report.sources && report.sources.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Key Sources</h4>
              <div className="space-y-3">
                {report.sources.slice(0, 8).map((source, i) => (
                  <div key={i} className="p-3 bg-zinc-800/30 rounded-lg">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:underline font-medium"
                    >
                      {source.title}
                    </a>
                    <p className="text-sm text-zinc-400 mt-1">{source.snippet}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-zinc-500">Relevance:</span>
                      <div className="w-16 h-1 bg-zinc-700 rounded-full">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(source.relevance || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Synthesis */}
        {report.synthesis && (
          <CollapsibleSection title="Synthesis" defaultOpen={true}>
            <div className="text-zinc-300 whitespace-pre-wrap">
              {report.synthesis}
            </div>
          </CollapsibleSection>
        )}

        {/* Conclusion */}
        {report.conclusion && (
          <CollapsibleSection title="Conclusion" defaultOpen={true}>
            <div className="text-zinc-300 whitespace-pre-wrap">
              {report.conclusion}
            </div>
          </CollapsibleSection>
        )}

        {/* Recommended Actions */}
        {report.recommended_actions && report.recommended_actions.length > 0 && (
          <CollapsibleSection title="Next Steps">
            <ul className="space-y-2">
              {report.recommended_actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-zinc-300">
                  <span className="text-brand-400 mt-1">→</span>
                  {action}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Suggested Contacts */}
        {report.suggested_contacts && report.suggested_contacts.length > 0 && (
          <CollapsibleSection title="Suggested Contacts" defaultOpen={true}>
            <p className="text-sm text-zinc-400 mb-4">
              Researchers who may be interested in reviewing this finding based on their published work.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.suggested_contacts.map((contact, i) => (
                <div key={i} className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      {contact.contact_url ? (
                        <a
                          href={contact.contact_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-400 hover:underline font-medium"
                        >
                          {contact.name}
                        </a>
                      ) : (
                        <span className="text-zinc-200 font-medium">{contact.name}</span>
                      )}
                      <p className="text-sm text-zinc-400">{contact.affiliation}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded">
                      {contact.score}%
                    </span>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div>
                      <span className="text-xs text-zinc-500">Why relevant:</span>
                      <p className="text-sm text-zinc-300">{contact.relevance}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Related work:</span>
                      <p className="text-sm text-zinc-300">{contact.related_work}</p>
                    </div>
                    {contact.email && (
                      <div>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm text-brand-400 hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-4 p-3 bg-zinc-800/30 rounded-lg">
              These contacts were identified based on their published work related to this finding.
              Review their research before reaching out.
            </p>
          </CollapsibleSection>
        )}
      </div>

      {/* Methodology Note */}
      <div className="mt-8 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
        <h4 className="text-sm font-medium text-zinc-400 mb-2">About This Report</h4>
        <p className="text-sm text-zinc-500">
          This report was generated by the Aletheia Research Agent, an autonomous system that
          discovers patterns in anomaly data, validates them statistically, and conducts external
          research to provide context. While the agent strives for accuracy, these reports should
          be considered preliminary analyses requiring human review.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="text-sm text-brand-400 hover:underline"
          >
            View Agent Terminal →
          </Link>
          <Link
            href="/agent/review"
            className="text-sm text-brand-400 hover:underline"
          >
            Review Queue →
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
