'use client';

/**
 * Prediction Detail Page
 * Full interactive page for viewing, testing, and submitting results for predictions
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleModeStepper, type SimpleSubmissionData } from '@/components/predictions/SimpleModeStepper';
import { QualityAssessment, type QualityScores, calculateQualityScore, hasZeroFactor } from '@/components/predictions/QualityAssessment';
import { isSimpleModeCompatible, getExpectedProportion } from '@/lib/domain-statistics';

// Status styling
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  open: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Open for Testing' },
  pending: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Pending' },
  testing: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Being Tested' },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Confirmed' },
  refuted: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'Refuted' },
  inconclusive: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Inconclusive' },
};

// Plain language explanations for normies
const STATUS_EXPLANATIONS: Record<string, string> = {
  open: "This prediction hasn't been tested yet. Be the first to run an experiment!",
  testing: "Scientists are currently running experiments to check if this prediction is true.",
  confirmed: "Multiple experiments have confirmed this prediction is correct!",
  refuted: "Experiments showed this prediction was wrong - which is still valuable scientific progress.",
  inconclusive: "Testing was done but results were mixed. More experiments needed.",
};

// Generate plain English explanation of what an experiment tests
function generatePlainExplanation(hypothesis: string): { intro: string; bullets: string[]; conclusion: string } {
  const h = hypothesis.toLowerCase();

  // Dynamic vs static targets
  if (h.includes('dynamic') && h.includes('static') && (h.includes('target') || h.includes('video') || h.includes('image'))) {
    return {
      intro: "This experiment compares two types of targets in Ganzfeld tests:",
      bullets: [
        "**Static targets:** Still images (like a photograph)",
        "**Dynamic targets:** Video clips (like a movie scene)"
      ],
      conclusion: "The prediction says video clips should be easier to 'receive' than still images. To test this, researchers run sessions with both types and compare the hit rates."
    };
  }

  // Sender vs no sender
  if (h.includes('sender') && (h.includes('no sender') || h.includes('without'))) {
    return {
      intro: "This experiment tests whether having a 'sender' matters:",
      bullets: [
        "**With sender:** Someone actively looks at the target image",
        "**Without sender:** No one views the target during the session"
      ],
      conclusion: "If receivers perform equally well without a sender, it would suggest the effect isn't about 'sending' information at all."
    };
  }

  // Emotional vs neutral
  if (h.includes('emotional') && h.includes('neutral')) {
    return {
      intro: "This experiment compares different types of content:",
      bullets: [
        "**Emotional targets:** Images/videos with strong emotional content",
        "**Neutral targets:** Bland, everyday scenes without emotional charge"
      ],
      conclusion: "The prediction says emotionally charged targets should produce higher hit rates, suggesting emotion amplifies the signal."
    };
  }

  // Relaxation/meditation
  if (h.includes('relax') || h.includes('meditat')) {
    return {
      intro: "This experiment tests whether mental state affects results:",
      bullets: [
        "**Relaxed state:** Receivers undergo relaxation or meditation before sessions",
        "**Normal state:** Receivers start without special preparation"
      ],
      conclusion: "If relaxed receivers score higher, it suggests a calm mental state makes the 'signal' easier to detect."
    };
  }

  // Geomagnetic activity
  if (h.includes('geomagnetic') || h.includes('magnetic') || h.includes('solar')) {
    return {
      intro: "This experiment looks for environmental correlations:",
      bullets: [
        "**Low geomagnetic activity:** Quiet space weather, stable magnetic field",
        "**High geomagnetic activity:** Solar storms, magnetic disturbances"
      ],
      conclusion: "The prediction suggests certain environmental conditions might enhance or suppress psi effects."
    };
  }

  // Remote viewing distance
  if (h.includes('distance') && (h.includes('remote') || h.includes('viewing'))) {
    return {
      intro: "This experiment tests whether distance affects accuracy:",
      bullets: [
        "**Near targets:** Locations close to the viewer",
        "**Far targets:** Locations hundreds or thousands of miles away"
      ],
      conclusion: "If accuracy is the same regardless of distance, it would suggest remote viewing isn't limited by physical separation."
    };
  }

  // Crisis apparition timing
  if (h.includes('crisis') && (h.includes('timing') || h.includes('simultaneous') || h.includes('before') || h.includes('after'))) {
    return {
      intro: "This analysis examines timing patterns in crisis apparitions:",
      bullets: [
        "**Simultaneous:** Apparition occurs at the exact moment of crisis",
        "**Before/After:** Apparition occurs hours before or after the event"
      ],
      conclusion: "Understanding timing patterns helps distinguish genuine anomalous perception from grief-related hallucinations."
    };
  }

  // NDE veridical perception
  if (h.includes('nde') || h.includes('near-death') || h.includes('veridical')) {
    return {
      intro: "This study examines what people perceive during near-death experiences:",
      bullets: [
        "**Veridical details:** Specific information the person couldn't have known",
        "**General impressions:** Typical NDE elements (tunnel, light, etc.)"
      ],
      conclusion: "Verified accurate perceptions during clinical death would challenge conventional understanding of consciousness."
    };
  }

  // Default fallback
  return {
    intro: "This experiment tests a specific prediction about how certain factors affect results:",
    bullets: [
      "**Condition A:** One set of experimental parameters",
      "**Condition B:** Different parameters to compare against"
    ],
    conclusion: `The hypothesis is: "${hypothesis}" — researchers compare outcomes under different conditions to see if this prediction holds.`
  };
}

interface Prediction {
  id: string;
  hypothesis: string;
  status: string;
  confidence_score: number;
  p_value: number | null;
  brier_score: number | null;
  domains_involved: string[];
  testing_protocol: string | null;
  created_at: string;
  resolved_at: string | null;
  pattern: {
    id: string;
    pattern_description: string;
    confidence_score: number;
  } | null;
}

interface Tester {
  id: string;
  status: string;
  institution: string | null;
  methodology_notes: string | null;
  expected_completion: string | null;
  claimed_at: string;
  user: {
    id: string;
    display_name: string;
    identity_type: string;
  };
}

interface TestResult {
  id: string;
  effect_observed: boolean;
  p_value: number | null;
  sample_size: number | null;
  effect_size: number | null;
  methodology: string;
  plain_summary: string | null;
  verification_status: string;
  submitted_at: string;
  preregistration_url: string | null;
  publication_url: string | null;
  submitter: {
    id: string;
    display_name: string;
    identity_type: string;
  };
}

interface ResultStats {
  total_submissions: number;
  verified_count: number;
  supporting_count: number;
  opposing_count: number;
  total_sample_size: number;
}

export default function PredictionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [testers, setTesters] = useState<Tester[]>([]);
  const [testerCounts, setTesterCounts] = useState({ active: 0, completed: 0, total: 0 });
  const [results, setResults] = useState<TestResult[]>([]);
  const [resultStats, setResultStats] = useState<ResultStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User test status (derived from testers list)
  const [userTestStatus, setUserTestStatus] = useState<string | null>(null);

  // UI state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form state for joining
  const [joinForm, setJoinForm] = useState({
    institution: '',
    methodology_notes: '',
    expected_completion: '',
  });

  // Form state for submitting results
  const [submitForm, setSubmitForm] = useState({
    effect_observed: true,
    p_value: '',
    sample_size: '',
    effect_size: '',
    methodology: '',
    deviations_from_protocol: '',
    plain_summary: '',
    preregistration_url: '',
    publication_url: '',
  });

  // Simple vs Advanced mode
  const [submissionMode, setSubmissionMode] = useState<'simple' | 'advanced'>('simple');

  // Quality assessment scores (multiplicative)
  const [qualityScores, setQualityScores] = useState<QualityScores>({
    isolation: 1.0,
    targetSelection: 1.0,
    dataIntegrity: 1.0,
    baseline: 1.0,
  });

  // Collapsible state
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTechnicalProtocol, setShowTechnicalProtocol] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Fetch prediction
      const predRes = await fetch(`/api/predictions/${id}`);
      const predData = await predRes.json();
      if (!predRes.ok) throw new Error(predData.error);
      setPrediction(predData);

      // Fetch testers
      const testersRes = await fetch(`/api/predictions/${id}/testers`);
      const testersData = await testersRes.json();
      if (testersRes.ok) {
        setTesters(testersData.data || []);
        setTesterCounts(testersData.counts || { active: 0, completed: 0, total: 0 });

        // Check if current user is testing this prediction
        if (user?.id) {
          const userTester = testersData.data?.find(
            (t: Tester) => t.user.id === user.id
          );
          setUserTestStatus(userTester?.status || null);
        }
      }

      // Fetch results
      const resultsRes = await fetch(`/api/predictions/${id}/results`);
      const resultsData = await resultsRes.json();
      if (resultsRes.ok) {
        setResults(resultsData.data || []);
        setResultStats(resultsData.stats || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  // Join testing
  const handleJoinTesting = async () => {
    setJoinLoading(true);
    try {
      const res = await fetch(`/api/predictions/${id}/testers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowJoinModal(false);
      fetchData(); // Refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join testing');
    } finally {
      setJoinLoading(false);
    }
  };

  // Submit results (Advanced Mode)
  const handleSubmitResults = async () => {
    // Check for auto-rejection
    if (hasZeroFactor(qualityScores)) {
      alert('Cannot submit: One or more quality factors is zero. This indicates a fatal methodology flaw.');
      return;
    }

    setSubmitLoading(true);
    try {
      const qualityScore = calculateQualityScore(qualityScores);
      const res = await fetch(`/api/predictions/${id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submitForm,
          submission_mode: 'advanced',
          p_value: submitForm.p_value ? parseFloat(submitForm.p_value) : null,
          sample_size: submitForm.sample_size ? parseInt(submitForm.sample_size) : null,
          effect_size: submitForm.effect_size ? parseFloat(submitForm.effect_size) : null,
          isolation_score: qualityScores.isolation,
          target_selection_score: qualityScores.targetSelection,
          data_integrity_score: qualityScores.dataIntegrity,
          baseline_score: qualityScores.baseline,
          quality_score: qualityScore,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowSubmitModal(false);
      fetchData(); // Refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit results');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Submit results (Simple Mode)
  const handleSimpleSubmit = async (data: SimpleSubmissionData) => {
    const res = await fetch(`/api/predictions/${id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        methodology: data.description,
        isolation_score: qualityScores.isolation,
        target_selection_score: qualityScores.targetSelection,
        data_integrity_score: qualityScores.dataIntegrity,
        baseline_score: qualityScores.baseline,
        quality_score: calculateQualityScore(qualityScores),
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);

    setShowSubmitModal(false);
    fetchData(); // Refresh
  };

  // Withdraw from testing
  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw from testing this prediction?')) return;
    try {
      const res = await fetch(`/api/predictions/${id}/testers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn' }),
      });
      if (!res.ok) throw new Error('Failed to withdraw');
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to withdraw');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="mt-4 text-zinc-400">Loading prediction...</p>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400">Error</h1>
          <p className="mt-2 text-zinc-400">{error || 'Prediction not found'}</p>
          <Link href="/predictions" className="mt-4 inline-block text-violet-400 hover:underline">
            Back to Predictions
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[prediction.status] || STATUS_STYLES.pending;
  const confidencePercent = ((prediction.confidence_score || 0) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Link
            href="/predictions"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Predictions
          </Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-zinc-100">{prediction.hypothesis}</h1>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Status Explanation for Normies */}
        <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200">What does this mean?</h3>
              <p className="mt-1 text-sm text-zinc-400">{STATUS_EXPLANATIONS[prediction.status]}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-violet-400">{confidencePercent}%</div>
            <div className="text-sm text-zinc-500">Confidence</div>
            <div className="mt-1 text-xs text-zinc-600">How sure we are this pattern is real</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{testerCounts.active}</div>
            <div className="text-sm text-zinc-500">Active Testers</div>
            <div className="mt-1 text-xs text-zinc-600">People running experiments now</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{resultStats?.verified_count || 0}</div>
            <div className="text-sm text-zinc-500">Results Submitted</div>
            <div className="mt-1 text-xs text-zinc-600">Completed experiments</div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-zinc-300">{resultStats?.total_sample_size || 0}</div>
            <div className="text-sm text-zinc-500">Total Samples</div>
            <div className="mt-1 text-xs text-zinc-600">Data points collected</div>
          </div>
        </div>

        {/* Call to Action */}
        {(prediction.status === 'open' || prediction.status === 'testing') && (
          <div className="rounded-xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {userTestStatus === 'active' ? "You're testing this prediction!" : "Help test this prediction"}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {userTestStatus === 'active'
                    ? "Submit your results when you're done, or withdraw if you can't complete."
                    : "Join the testing effort to help verify or refute this scientific prediction."}
                </p>
              </div>
              <div className="flex gap-3">
                {!isAuthenticated ? (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
                  >
                    Sign in to Join
                  </button>
                ) : userTestStatus === 'active' ? (
                  <>
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
                    >
                      Submit Results
                    </button>
                    <button
                      onClick={handleWithdraw}
                      className="rounded-lg border border-zinc-600 px-4 py-3 text-zinc-400 hover:bg-zinc-800"
                    >
                      Withdraw
                    </button>
                  </>
                ) : userTestStatus === 'completed' ? (
                  <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-6 py-3 text-emerald-400">
                    You submitted results
                  </span>
                ) : (
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
                  >
                    Join Testing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        {resultStats && (resultStats.supporting_count > 0 || resultStats.opposing_count > 0) && (
          <div className="rounded-xl bg-zinc-800/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Testing Progress</h2>

            {/* Visual progress bar */}
            <div className="mb-4">
              <div className="flex gap-1 h-8 rounded-lg overflow-hidden bg-zinc-700/50">
                {resultStats.supporting_count > 0 && (
                  <div
                    className="bg-emerald-500 flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: `${(resultStats.supporting_count / (resultStats.supporting_count + resultStats.opposing_count)) * 100}%` }}
                  >
                    {resultStats.supporting_count} Supporting
                  </div>
                )}
                {resultStats.opposing_count > 0 && (
                  <div
                    className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: `${(resultStats.opposing_count / (resultStats.supporting_count + resultStats.opposing_count)) * 100}%` }}
                  >
                    {resultStats.opposing_count} Opposing
                  </div>
                )}
              </div>
            </div>

            {/* Plain language summary */}
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-700">
              <p className="text-sm text-zinc-300">
                {resultStats.supporting_count > resultStats.opposing_count
                  ? `So far, ${resultStats.supporting_count} out of ${resultStats.verified_count} experiments support this prediction. With ${resultStats.total_sample_size} total data points collected, the evidence is leaning toward confirmation.`
                  : resultStats.opposing_count > resultStats.supporting_count
                    ? `So far, ${resultStats.opposing_count} out of ${resultStats.verified_count} experiments oppose this prediction. The current evidence suggests this prediction may be wrong.`
                    : `Results are evenly split with ${resultStats.supporting_count} supporting and ${resultStats.opposing_count} opposing. More testing is needed.`
                }
              </p>
            </div>
          </div>
        )}

        {/* How Testing Works - Collapsible */}
        <div className="rounded-xl border border-zinc-700/50 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="font-medium text-zinc-200">How does this work?</span>
            </div>
            <svg
              className={`w-5 h-5 text-zinc-400 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showHowItWorks && (
            <div className="px-4 pb-5 border-t border-zinc-700/50">
              <div className="pt-4">
                <h3 className="text-base font-semibold text-zinc-100 mb-4">How Testing Works</h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">1</div>
                    <div>
                      <span className="font-medium text-zinc-200">See prediction</span>
                      <span className="text-zinc-400"> → Read what we&apos;re trying to verify</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">2</div>
                    <div>
                      <span className="font-medium text-zinc-200">Read protocol</span>
                      <span className="text-zinc-400"> → Follow the recommended methodology</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">3</div>
                    <div>
                      <span className="font-medium text-zinc-200">Run your experiment</span>
                      <span className="text-zinc-400"> → In your lab, at home, wherever you do research</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">4</div>
                    <div>
                      <span className="font-medium text-zinc-200">Submit results</span>
                      <span className="text-zinc-400"> → Come back and report your p-value, sample size, outcome</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">5</div>
                    <div>
                      <span className="font-medium text-zinc-200">Evidence accumulates</span>
                      <span className="text-zinc-400"> → Multiple researchers test, results aggregate, prediction gets confirmed or refuted</span>
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-sm text-zinc-500 italic border-l-2 border-zinc-700 pl-3">
                  Aletheia doesn&apos;t run experiments. We coordinate distributed researchers testing the same hypotheses with standardized methods.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Testing Protocol - Plain English + Technical */}
        {prediction.testing_protocol && (() => {
          const plainExplanation = generatePlainExplanation(prediction.hypothesis);
          return (
            <div className="rounded-xl bg-zinc-800/50 p-6">
              <h2 className="text-lg font-semibold text-zinc-200 mb-4">What This Experiment Tests</h2>

              {/* Plain English Version (always visible) */}
              <div className="space-y-4">
                <p className="text-zinc-300">{plainExplanation.intro}</p>

                <ul className="space-y-2 ml-1">
                  {plainExplanation.bullets.map((bullet, idx) => {
                    const [boldPart, ...rest] = bullet.split(':**');
                    const label = boldPart.replace('**', '');
                    const description = rest.join(':**');
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-violet-400 mt-1">•</span>
                        <span>
                          <strong className="text-zinc-200">{label}:</strong>
                          <span className="text-zinc-400">{description}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <p className="text-zinc-400">{plainExplanation.conclusion}</p>
              </div>

              {/* Technical Protocol Toggle */}
              <div className="mt-6 pt-4 border-t border-zinc-700/50">
                <button
                  onClick={() => setShowTechnicalProtocol(!showTechnicalProtocol)}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showTechnicalProtocol ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {showTechnicalProtocol ? 'Hide technical protocol' : 'Show technical protocol'}
                </button>

                {showTechnicalProtocol && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-1 rounded">For researchers</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono bg-zinc-900/50 p-4 rounded-lg">
                      {prediction.testing_protocol}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Active Testers */}
        {testers.length > 0 && (
          <div className="rounded-xl bg-zinc-800/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              Who&apos;s Testing ({testerCounts.active} active, {testerCounts.completed} completed)
            </h2>
            <div className="space-y-3">
              {testers.map((tester) => (
                <div
                  key={tester.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    tester.status === 'active'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : tester.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-zinc-800/50 border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      tester.status === 'active' ? 'bg-amber-400 animate-pulse' :
                      tester.status === 'completed' ? 'bg-emerald-400' : 'bg-zinc-500'
                    }`} />
                    <div>
                      <div className="font-medium text-zinc-200">
                        {tester.user.display_name}
                        {tester.user.id === user?.id && (
                          <span className="ml-2 text-xs text-violet-400">(you)</span>
                        )}
                      </div>
                      {tester.institution && (
                        <div className="text-sm text-zinc-500">{tester.institution}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      tester.status === 'active' ? 'text-amber-400' :
                      tester.status === 'completed' ? 'text-emerald-400' : 'text-zinc-500'
                    }`}>
                      {tester.status === 'active' ? 'Testing...' :
                       tester.status === 'completed' ? 'Submitted' : 'Withdrawn'}
                    </div>
                    {tester.expected_completion && tester.status === 'active' && (
                      <div className="text-xs text-zinc-500">
                        Expected: {new Date(tester.expected_completion).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted Results */}
        {results.length > 0 && (
          <div className="rounded-xl bg-zinc-800/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Submitted Results</h2>
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`p-4 rounded-lg border ${
                    result.effect_observed
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.effect_observed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {result.effect_observed ? 'Supports Prediction' : 'Opposes Prediction'}
                      </div>
                      {result.verification_status === 'verified' && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                          Verified
                        </span>
                      )}
                      {result.verification_status === 'pending' && (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                          Pending Review
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {new Date(result.submitted_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Plain language summary */}
                  {result.plain_summary && (
                    <p className="text-zinc-300 mb-3">{result.plain_summary}</p>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {result.p_value != null && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                        <div className={`font-mono font-medium ${result.p_value < 0.05 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          p = {result.p_value.toFixed(4)}
                        </div>
                        <div className="text-xs text-zinc-600">
                          {result.p_value < 0.05 ? 'Statistically significant' : 'Not significant'}
                        </div>
                      </div>
                    )}
                    {result.sample_size != null && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                        <div className="font-medium text-zinc-300">n = {result.sample_size}</div>
                        <div className="text-xs text-zinc-600">Sample size</div>
                      </div>
                    )}
                    {result.effect_size != null && (
                      <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                        <div className="font-medium text-zinc-300">d = {result.effect_size.toFixed(2)}</div>
                        <div className="text-xs text-zinc-600">Effect size</div>
                      </div>
                    )}
                  </div>

                  {/* Links */}
                  <div className="flex gap-3 text-sm">
                    {result.preregistration_url && (
                      <a
                        href={result.preregistration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:underline"
                      >
                        Pre-registration →
                      </a>
                    )}
                    {result.publication_url && (
                      <a
                        href={result.publication_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:underline"
                      >
                        Publication →
                      </a>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-700/50 text-sm text-zinc-500">
                    Submitted by {result.submitter.display_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source Pattern */}
        {prediction.pattern && (
          <div className="rounded-xl bg-zinc-800/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Where This Prediction Came From</h2>
            <p className="text-sm text-zinc-400 mb-4">
              This prediction was automatically generated when our pattern matcher found a reliable correlation across multiple research domains.
            </p>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
              <p className="text-zinc-300">{prediction.pattern.pattern_description}</p>
              <div className="mt-2 text-sm text-zinc-500">
                Pattern Confidence: {((prediction.pattern.confidence_score || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Domains */}
        {prediction.domains_involved && prediction.domains_involved.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">Research Domains Involved</h2>
            <div className="flex flex-wrap gap-2">
              {prediction.domains_involved.map((domain: string) => (
                <span
                  key={domain}
                  className="rounded-full bg-violet-500/10 border border-violet-500/30 px-3 py-1 text-sm text-violet-300"
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          <div className="flex gap-6">
            <div>Created: {new Date(prediction.created_at).toLocaleDateString()}</div>
            {prediction.resolved_at && (
              <div>Resolved: {new Date(prediction.resolved_at).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </main>

      {/* Join Testing Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Join Testing</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Let others know you&apos;re working on testing this prediction. This helps coordinate research efforts and prevents duplicate work.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Institution / Lab (optional)
                </label>
                <input
                  type="text"
                  value={joinForm.institution}
                  onChange={(e) => setJoinForm({ ...joinForm, institution: e.target.value })}
                  placeholder="e.g., University of Edinburgh"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Your Approach (optional)
                </label>
                <textarea
                  value={joinForm.methodology_notes}
                  onChange={(e) => setJoinForm({ ...joinForm, methodology_notes: e.target.value })}
                  placeholder="Brief notes on how you plan to test this..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Expected Completion Date (optional)
                </label>
                <input
                  type="date"
                  value={joinForm.expected_completion}
                  onChange={(e) => setJoinForm({ ...joinForm, expected_completion: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinTesting}
                disabled={joinLoading}
                className="rounded-lg bg-violet-600 px-6 py-2 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {joinLoading ? 'Joining...' : 'Join Testing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Results Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto py-8">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 max-w-2xl w-full mx-4 my-auto">
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Submit Test Results</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Share what you found. Your results will be reviewed before being published.
            </p>

            {/* Mode Toggle */}
            <div className="mb-6 border-b border-zinc-700">
              <div className="flex gap-1">
                <button
                  onClick={() => setSubmissionMode('simple')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    submissionMode === 'simple'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Simple Mode
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">Recommended</span>
                </button>
                <button
                  onClick={() => setSubmissionMode('advanced')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    submissionMode === 'advanced'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Advanced Mode
                </button>
              </div>
            </div>

            {/* Simple Mode */}
            {submissionMode === 'simple' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="text-sm text-emerald-300">
                      <strong>Simple Mode:</strong> Just enter your trials and hits. We calculate the statistics for you!
                    </div>
                  </div>
                </div>

                <SimpleModeStepper
                  predictionId={id}
                  expectedProportion={
                    prediction?.domains_involved?.[0]
                      ? (() => {
                          try {
                            return getExpectedProportion(prediction.domains_involved[0] as 'ganzfeld' | 'stargate' | 'nde' | 'crisis_apparition' | 'geophysical');
                          } catch {
                            return 0.25;
                          }
                        })()
                      : 0.25
                  }
                  onSubmit={handleSimpleSubmit}
                  onCancel={() => setShowSubmitModal(false)}
                />
              </div>
            )}

            {/* Advanced Mode */}
            {submissionMode === 'advanced' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Main result */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Did your experiment support the prediction? *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSubmitForm({ ...submitForm, effect_observed: true })}
                      className={`flex-1 py-3 rounded-lg border font-medium transition ${
                        submitForm.effect_observed
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      Yes, Supports
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmitForm({ ...submitForm, effect_observed: false })}
                      className={`flex-1 py-3 rounded-lg border font-medium transition ${
                        !submitForm.effect_observed
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      No, Opposes
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">P-Value</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={submitForm.p_value}
                      onChange={(e) => setSubmitForm({ ...submitForm, p_value: e.target.value })}
                      placeholder="0.05"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Sample Size</label>
                    <input
                      type="number"
                      value={submitForm.sample_size}
                      onChange={(e) => setSubmitForm({ ...submitForm, sample_size: e.target.value })}
                      placeholder="100"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Effect Size (d)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={submitForm.effect_size}
                      onChange={(e) => setSubmitForm({ ...submitForm, effect_size: e.target.value })}
                      placeholder="0.25"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quality Assessment */}
                <div className="border-t border-zinc-700 pt-4">
                  <h3 className="text-sm font-semibold text-zinc-200 mb-3">Methodology Quality Assessment</h3>
                  <QualityAssessment
                    scores={qualityScores}
                    onChange={setQualityScores}
                  />
                </div>

                {/* Methodology */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Methodology *
                  </label>
                  <textarea
                    value={submitForm.methodology}
                    onChange={(e) => setSubmitForm({ ...submitForm, methodology: e.target.value })}
                    placeholder="Describe your experimental setup, participants, materials, and procedures..."
                    rows={4}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Deviations */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Deviations from Protocol
                  </label>
                  <textarea
                    value={submitForm.deviations_from_protocol}
                    onChange={(e) => setSubmitForm({ ...submitForm, deviations_from_protocol: e.target.value })}
                    placeholder="Any changes you made to the recommended testing protocol..."
                    rows={2}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Plain summary */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Plain Language Summary
                  </label>
                  <p className="text-xs text-zinc-500 mb-2">
                    Explain your results so anyone can understand, not just scientists.
                  </p>
                  <textarea
                    value={submitForm.plain_summary}
                    onChange={(e) => setSubmitForm({ ...submitForm, plain_summary: e.target.value })}
                    placeholder="e.g., We tested 50 people and found that dynamic videos did produce higher hit rates than static images, but the difference wasn't large enough to rule out chance..."
                    rows={3}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Links */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Pre-registration URL</label>
                    <input
                      type="url"
                      value={submitForm.preregistration_url}
                      onChange={(e) => setSubmitForm({ ...submitForm, preregistration_url: e.target.value })}
                      placeholder="https://osf.io/..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Publication URL</label>
                    <input
                      type="url"
                      value={submitForm.publication_url}
                      onChange={(e) => setSubmitForm({ ...submitForm, publication_url: e.target.value })}
                      placeholder="https://doi.org/..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-700">
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitResults}
                    disabled={submitLoading || !submitForm.methodology || hasZeroFactor(qualityScores)}
                    className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {submitLoading ? 'Submitting...' : 'Submit Results'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          fetchData();
        }}
      />
    </div>
  );
}
