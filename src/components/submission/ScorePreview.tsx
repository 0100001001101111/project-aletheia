'use client';

/**
 * ScorePreview
 * Step 6: Pre-submission score estimate with improvement paths
 * The key innovation - show estimated score BEFORE submit
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Witness } from './WitnessesForm';
import type { EvidenceItem } from './EvidenceForm';
import type { UAPDomainData } from './UAP_FieldsForm';
import type { BasicInfoData } from './BasicInfoForm';
import type { InvestigationType } from '@/types/database';
import {
  calculateScore,
  generateImprovementSuggestions,
  type SubmissionData,
  type ScoreBreakdown,
  type ImprovementSuggestion,
} from '@/lib/scoring';
import {
  calculateMultiplicativeScore,
  type MultiplicativeBreakdown,
} from '@/lib/multiplicative-triage';
import { MultiplicativeScoreDisplay } from './MultiplicativeScoreDisplay';
import type { GamingFlag } from '@/lib/anti-gaming';

// Domains that use multiplicative scoring (experimental protocols)
const MULTIPLICATIVE_DOMAINS: InvestigationType[] = ['ganzfeld', 'stargate'];

interface ScorePreviewProps {
  investigationType: InvestigationType;
  basicInfo: BasicInfoData;
  witnesses: Witness[];
  domainData: UAPDomainData;
  evidence: EvidenceItem[];
  draftId?: string;
  onNext: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'verified': return 'text-emerald-400';
    case 'provisional': return 'text-amber-400';
    case 'rejected': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

function getTierBg(tier: string): string {
  switch (tier) {
    case 'verified': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'provisional': return 'bg-amber-500/10 border-amber-500/30';
    case 'rejected': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-zinc-800 border-zinc-700';
  }
}

/**
 * Convert form data to scoring library format
 */
function toSubmissionData(
  witnesses: Witness[],
  evidence: EvidenceItem[],
  basicInfo: BasicInfoData
): SubmissionData {
  return {
    witnesses: witnesses.map(w => ({
      identityType: w.identityType,
      role: w.role,
      verificationStatus: w.verificationStatus,
      willingToTestify: w.willingToTestify,
      willingPolygraph: w.willingPolygraph,
      blindAudit: w.blindAudit,
    })),
    evidence: evidence.map(e => ({
      category: e.category,
      daysFromEvent: e.daysFromEvent,
      isPrimarySource: e.isPrimarySource,
      independentlyVerified: e.independentlyVerified,
    })),
    eventDate: basicInfo.eventDate,
    physicalEvidencePresent: false, // Could be derived from domainData if needed
  };
}

export function ScorePreview({
  investigationType,
  basicInfo,
  witnesses,
  domainData,
  evidence,
  draftId,
  onNext,
  onBack,
  onSaveDraft,
}: ScorePreviewProps) {
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [multiplicativeScore, setMultiplicativeScore] = useState<MultiplicativeBreakdown | null>(null);
  const [improvements, setImprovements] = useState<ImprovementSuggestion[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);
  const [gamingFlags, setGamingFlags] = useState<GamingFlag[]>([]);
  const [iterationCount, setIterationCount] = useState(0);

  // Check if this domain uses multiplicative scoring
  const useMultiplicative = MULTIPLICATIVE_DOMAINS.includes(investigationType);

  // Convert form data to submission data format
  const submissionData = useMemo(
    () => toSubmissionData(witnesses, evidence, basicInfo),
    [witnesses, evidence, basicInfo]
  );

  // Build raw data format for multiplicative scoring
  const rawDataFormat = useMemo(() => ({
    raw_narrative: basicInfo.summary,
    raw_data: {
      basicInfo,
      witnesses: witnesses.map(w => ({
        identityType: w.identityType,
        verificationStatus: w.verificationStatus,
        role: w.role,
      })),
      evidence: evidence.map(e => ({
        category: e.category,
        daysFromEvent: e.daysFromEvent,
        isPrimarySource: e.isPrimarySource,
        independentlyVerified: e.independentlyVerified,
      })),
      domainData,
      protocol: domainData,
    },
  }), [basicInfo, witnesses, evidence, domainData]);

  // Log score estimate for anti-gaming audit
  const logScoreAudit = useCallback(async (calculated: ScoreBreakdown) => {
    if (!draftId) return;

    try {
      const response = await fetch('/api/submissions/score-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          witnesses,
          evidence,
          score: {
            finalScore: calculated.finalScore,
            tier: calculated.tier,
            breakdown: calculated.breakdown,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGamingFlags(data.flags || []);
        setIterationCount(data.iterationCount || 0);
      }
    } catch (error) {
      console.error('Failed to log score audit:', error);
    }
  }, [draftId, witnesses, evidence]);

  useEffect(() => {
    // Simulate calculation delay for UX
    setIsCalculating(true);
    const timer = setTimeout(async () => {
      // Calculate both scoring types
      const calculated = calculateScore(investigationType, submissionData);
      setScore(calculated);
      setImprovements(generateImprovementSuggestions(submissionData, calculated));

      // Calculate multiplicative score if applicable
      if (useMultiplicative) {
        const multScore = calculateMultiplicativeScore(rawDataFormat, investigationType);
        setMultiplicativeScore(multScore);
      }

      // Log to audit trail
      await logScoreAudit(calculated);

      setIsCalculating(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [investigationType, submissionData, rawDataFormat, useMultiplicative, logScoreAudit]);

  if (isCalculating || !score) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <p className="mt-4 text-zinc-400">Calculating quality score...</p>
      </div>
    );
  }

  // For multiplicative domains, show multiplicative display
  if (useMultiplicative && multiplicativeScore) {
    const canSubmit = !multiplicativeScore.hasFatalFactor;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-100">Pre-Submission Review</h2>
          <p className="mt-2 text-zinc-400">
            Experimental protocols use multiplicative scoring — critical failures zero out the score
          </p>
        </div>

        <MultiplicativeScoreDisplay breakdown={multiplicativeScore} showFormula />

        {/* Gaming Detection Warning */}
        {gamingFlags.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-red-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-300">Score Integrity Notice</h4>
                <div className="mt-2 space-y-1">
                  {gamingFlags.map((flag, i) => (
                    <p key={i} className="text-xs text-red-400/80">
                      {flag.reason}
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Submission modifications are logged for quality assurance.
                  {iterationCount >= 5 && ` (${iterationCount} score calculations logged)`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <button
            onClick={onBack}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={onSaveDraft}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Save Draft
            </button>
            <button
              onClick={onNext}
              disabled={!canSubmit}
              className={`rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors ${
                !canSubmit
                  ? 'bg-zinc-600 cursor-not-allowed'
                  : multiplicativeScore.tier === 'rejected'
                    ? 'bg-red-600 hover:bg-red-500'
                    : multiplicativeScore.tier === 'provisional'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {!canSubmit
                ? 'Fix Fatal Issues to Submit'
                : multiplicativeScore.tier === 'provisional'
                  ? 'Submit as Provisional'
                  : 'Submit for Verification'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard additive scoring display
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100">Pre-Submission Review</h2>
        <p className="mt-2 text-zinc-400">
          Review your estimated quality score before submitting
        </p>
      </div>

      {/* Main Score Card */}
      <div className={`rounded-xl border p-6 ${getTierBg(score.tier)}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-zinc-400 uppercase tracking-wide">Estimated Quality Score</div>
            <div className={`text-5xl font-bold ${getTierColor(score.tier)}`}>
              {score.finalScore.toFixed(1)}
              <span className="text-2xl text-zinc-500">/10</span>
            </div>
          </div>
          <div className={`rounded-lg px-4 py-2 ${getTierBg(score.tier)}`}>
            <div className="text-xs text-zinc-400 uppercase">Status</div>
            <div className={`text-lg font-semibold ${getTierColor(score.tier)} capitalize`}>
              {score.tier}
            </div>
          </div>
        </div>

        {/* Tier explanation */}
        <div className="mt-4 p-3 rounded-lg bg-zinc-900/50">
          {score.tier === 'verified' && (
            <p className="text-sm text-zinc-300">
              This investigation will contribute to pattern matching and predictions.
            </p>
          )}
          {score.tier === 'provisional' && (
            <p className="text-sm text-zinc-300">
              This investigation will be visible in Community Findings. Improve score to 8.0+ for Verified status.
            </p>
          )}
          {score.tier === 'rejected' && (
            <p className="text-sm text-zinc-300">
              Score below 4.0. See improvement suggestions below to increase quality.
            </p>
          )}
        </div>
      </div>

      {/* Gaming Detection Warning */}
      {gamingFlags.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-red-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-300">Score Integrity Notice</h4>
              <div className="mt-2 space-y-1">
                {gamingFlags.map((flag, i) => (
                  <p key={i} className="text-xs text-red-400/80">
                    {flag.reason}
                  </p>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Submission modifications are logged for quality assurance.
                {iterationCount >= 5 && ` (${iterationCount} score calculations logged)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h3 className="font-semibold text-zinc-200 mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Witness Credibility', value: score.breakdown.witnessCredibility, max: 2.0, weight: '30%' },
            { label: 'Documentation Timing', value: score.breakdown.documentationTiming, max: 2.0, weight: '25%' },
            { label: 'Evidence Quality', value: score.breakdown.evidenceQuality, max: 2.0, weight: '20%' },
            { label: 'Corroboration', value: score.breakdown.corroboration, max: 2.0, weight: '15%' },
            { label: 'Verifiability', value: score.breakdown.verifiability, max: 2.0, weight: '10%' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="w-44 text-sm text-zinc-400">
                {item.label}
                <span className="ml-1 text-xs text-zinc-500">({item.weight})</span>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.value / item.max >= 0.75 ? 'bg-emerald-500' :
                      item.value / item.max >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(item.value / item.max) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-right text-sm font-medium text-zinc-200">
                {item.value.toFixed(1)}/{item.max}
              </div>
            </div>
          ))}
        </div>

        {/* Bonuses Applied */}
        {score.bonusesApplied.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <div className="text-sm text-zinc-400 mb-2">Bonuses Applied:</div>
            <div className="space-y-1">
              {score.bonusesApplied.map((bonus, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-emerald-400">+ {bonus.reason}</span>
                  <span className="text-emerald-400 font-medium">+{bonus.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bonuses Not Applied */}
        {score.bonusesNotApplied.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <div className="text-sm text-zinc-400 mb-2">Bonuses Not Applied:</div>
            <div className="space-y-2">
              {score.bonusesNotApplied.map((bonus, i) => (
                <div key={i} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">○ {bonus.reason}</span>
                    <span className="text-zinc-500">+{bonus.value.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-amber-400 ml-4">{bonus.requirement}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Improvement Suggestions */}
      {improvements.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h3 className="font-semibold text-amber-300 mb-4">How to Improve</h3>
          <div className="space-y-3">
            {improvements.map((imp, i) => (
              <div key={i} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-amber-500"
                  disabled
                />
                <div className="flex-1">
                  <div className="text-sm text-zinc-200">{imp.action}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-emerald-400">+{imp.impact.toFixed(1)} impact</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      imp.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                      imp.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {imp.difficulty}
                    </span>
                    <span className="text-xs text-zinc-500">{imp.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Explanation */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">How Scoring Works</h4>
        <p className="text-xs text-zinc-500">
          Your score is calculated using a weighted sum of five components: witness credibility (30%),
          documentation timing (25%), evidence quality (20%), corroboration (15%), and verifiability (10%).
          Bonuses are added for exceptional documentation like verified professional witnesses or official
          FOIA documents. Scores of 8.0+ are &quot;Verified&quot; and contribute to pattern matching.
          Scores 4.0-7.9 are &quot;Provisional&quot; and visible in Community Findings.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={onSaveDraft}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Save Draft
          </button>
          <button
            onClick={onNext}
            className={`rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors ${
              score.tier === 'rejected'
                ? 'bg-red-600 hover:bg-red-500'
                : score.tier === 'provisional'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {score.tier === 'rejected'
              ? 'Submit Anyway'
              : score.tier === 'provisional'
                ? 'Submit as Provisional'
                : 'Submit for Verification'}
          </button>
        </div>
      </div>
    </div>
  );
}
