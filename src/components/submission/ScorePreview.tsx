'use client';

/**
 * ScorePreview
 * Step 6: Pre-submission score estimate with improvement paths
 * The key innovation - show estimated score BEFORE submit
 */

import { useState, useEffect } from 'react';
import type { Witness } from './WitnessesForm';
import type { EvidenceItem } from './EvidenceForm';
import type { UAPDomainData } from './UAP_FieldsForm';
import type { BasicInfoData } from './BasicInfoForm';
import type { InvestigationType } from '@/types/database';

interface ScoreBreakdown {
  witnessCredibility: number;
  documentationTiming: number;
  evidenceQuality: number;
  corroboration: number;
  verifiability: number;
  bonusesApplied: Array<{ name: string; value: number }>;
  bonusesNotApplied: Array<{ name: string; value: number; reason: string }>;
  total: number;
  tier: 'verified' | 'provisional' | 'rejected';
}

interface ImprovementSuggestion {
  action: string;
  impact: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ScorePreviewProps {
  investigationType: InvestigationType;
  basicInfo: BasicInfoData;
  witnesses: Witness[];
  domainData: UAPDomainData;
  evidence: EvidenceItem[];
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

// Client-side score calculation (simplified version of server-side)
function calculateScoreBreakdown(
  witnesses: Witness[],
  evidence: EvidenceItem[],
  basicInfo: BasicInfoData
): ScoreBreakdown {
  let witnessCredibility = 0;
  let documentationTiming = 0;
  let evidenceQuality = 0;
  let corroboration = 0;
  let verifiability = 0;
  const bonusesApplied: Array<{ name: string; value: number }> = [];
  const bonusesNotApplied: Array<{ name: string; value: number; reason: string }> = [];

  // Witness Credibility (max 2.0)
  const professionalWitnesses = witnesses.filter(w =>
    w.identityType === 'named_professional' || w.identityType === 'named_official'
  );
  const verifiedProfessionals = professionalWitnesses.filter(w =>
    w.verificationStatus === 'independently_verified'
  );
  const directWitnesses = witnesses.filter(w => w.role === 'primary_direct');

  if (verifiedProfessionals.length >= 3) {
    witnessCredibility = 2.0;
  } else if (verifiedProfessionals.length >= 1) {
    witnessCredibility = 1.5;
  } else if (professionalWitnesses.length >= 1) {
    witnessCredibility = 0.8;
  } else if (directWitnesses.length >= 1) {
    witnessCredibility = 0.5;
  } else {
    witnessCredibility = 0.2;
  }

  // Documentation Timing (max 2.0)
  // Based on days between event and documentation
  const eventDate = new Date(basicInfo.eventDate);
  const now = new Date();
  const yearsSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  // Check for contemporary evidence
  const contemporaryEvidence = evidence.filter(e =>
    e.daysFromEvent !== null && Math.abs(e.daysFromEvent) <= 7
  );

  if (contemporaryEvidence.length >= 2) {
    documentationTiming = 2.0;
  } else if (contemporaryEvidence.length >= 1) {
    documentationTiming = 1.5;
  } else if (yearsSinceEvent <= 1) {
    documentationTiming = 1.0;
  } else if (yearsSinceEvent <= 5) {
    documentationTiming = 0.6;
  } else if (yearsSinceEvent <= 10) {
    documentationTiming = 0.4;
  } else {
    documentationTiming = 0.3;
  }

  // Evidence Quality (max 2.0)
  const CATEGORY_WEIGHTS: Record<string, number> = {
    'contemporary_official': 1.0,
    'contemporary_news': 0.9,
    'contemporary_photo_video': 0.85,
    'academic_paper': 0.8,
    'foia_document': 0.7,
    'later_testimony_video': 0.6,
    'later_testimony_written': 0.5,
    'other': 0.3,
  };

  if (evidence.length > 0) {
    const avgWeight = evidence.reduce((sum, e) =>
      sum + (CATEGORY_WEIGHTS[e.category] || 0.3), 0
    ) / evidence.length;
    const primarySourceBonus = evidence.some(e => e.isPrimarySource) ? 0.2 : 0;
    evidenceQuality = Math.min(2.0, (avgWeight * 2) + primarySourceBonus);
  }

  // Corroboration (max 2.0)
  if (witnesses.length >= 6) {
    corroboration = 2.0;
  } else if (witnesses.length >= 3) {
    corroboration = 1.5;
  } else if (witnesses.length >= 2) {
    corroboration = 1.0;
  } else {
    corroboration = 0.3;
  }

  // Verifiability (max 2.0)
  const verifiedWitnesses = witnesses.filter(w =>
    w.verificationStatus === 'independently_verified'
  );
  const verifiedEvidence = evidence.filter(e => e.independentlyVerified);

  if (verifiedWitnesses.length >= 2 && verifiedEvidence.length >= 2) {
    verifiability = 2.0;
  } else if (verifiedWitnesses.length >= 1 || verifiedEvidence.length >= 1) {
    verifiability = 1.0;
  } else if (witnesses.some(w => w.verificationStatus === 'documentation_provided')) {
    verifiability = 0.6;
  } else {
    verifiability = 0.4;
  }

  // Bonuses
  if (verifiedProfessionals.length >= 3) {
    bonusesApplied.push({ name: '3+ verified professional witnesses', value: 1.0 });
  } else if (professionalWitnesses.length >= 3) {
    bonusesNotApplied.push({
      name: '3+ verified professional witnesses',
      value: 1.0,
      reason: 'Credentials not independently verified'
    });
  }

  const foiaDoc = evidence.find(e => e.category === 'foia_document');
  if (foiaDoc) {
    bonusesApplied.push({ name: 'Official FOIA document', value: 0.2 });
  }

  const officialDocs = evidence.filter(e => e.category === 'contemporary_official');
  if (officialDocs.length >= 1) {
    bonusesApplied.push({ name: 'Contemporary official documentation', value: 0.3 });
  }

  const willingToTestify = witnesses.filter(w => w.willingToTestify);
  if (willingToTestify.length >= 2) {
    bonusesApplied.push({ name: '2+ witnesses willing to testify', value: 0.2 });
  }

  // Calculate total
  const baseScore = witnessCredibility + documentationTiming + evidenceQuality + corroboration + verifiability;
  const bonusTotal = bonusesApplied.reduce((sum, b) => sum + b.value, 0);
  const total = Math.min(10, baseScore + bonusTotal);

  // Determine tier
  let tier: 'verified' | 'provisional' | 'rejected';
  if (total >= 8.0) {
    tier = 'verified';
  } else if (total >= 4.0) {
    tier = 'provisional';
  } else {
    tier = 'rejected';
  }

  return {
    witnessCredibility,
    documentationTiming,
    evidenceQuality,
    corroboration,
    verifiability,
    bonusesApplied,
    bonusesNotApplied,
    total,
    tier,
  };
}

function generateImprovements(
  score: ScoreBreakdown,
  witnesses: Witness[],
  evidence: EvidenceItem[]
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  // Witness verification improvements
  const unverifiedProfessionals = witnesses.filter(w =>
    (w.identityType === 'named_professional' || w.identityType === 'named_official') &&
    w.verificationStatus !== 'independently_verified'
  );

  unverifiedProfessionals.forEach(w => {
    suggestions.push({
      action: `Verify ${w.name || 'witness'}'s ${w.profession || 'professional'} credentials`,
      impact: 0.3,
      difficulty: 'medium',
    });
  });

  // Evidence improvements
  if (!evidence.some(e => e.category === 'contemporary_official')) {
    suggestions.push({
      action: 'Locate contemporary official documents (police reports, military records)',
      impact: 0.5,
      difficulty: 'hard',
    });
  }

  if (!evidence.some(e => e.category === 'contemporary_news')) {
    suggestions.push({
      action: 'Find contemporary news articles from within 7 days of event',
      impact: 0.3,
      difficulty: 'medium',
    });
  }

  // Witness improvements
  const witnessesWithoutBlindAudit = witnesses.filter(w => w.blindAudit === 'unknown');
  if (witnessesWithoutBlindAudit.length > 0) {
    suggestions.push({
      action: 'Confirm whether witnesses were isolated before testimony (blind audit)',
      impact: 0.1,
      difficulty: 'easy',
    });
  }

  const unverifiedEvidence = evidence.filter(e => !e.independentlyVerified);
  if (unverifiedEvidence.length > 0) {
    suggestions.push({
      action: 'Independently verify evidence sources',
      impact: 0.2 * unverifiedEvidence.length,
      difficulty: 'medium',
    });
  }

  return suggestions.sort((a, b) => b.impact - a.impact).slice(0, 5);
}

export function ScorePreview({
  investigationType,
  basicInfo,
  witnesses,
  domainData,
  evidence,
  onNext,
  onBack,
  onSaveDraft,
}: ScorePreviewProps) {
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [improvements, setImprovements] = useState<ImprovementSuggestion[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    // Simulate calculation delay for UX
    setIsCalculating(true);
    const timer = setTimeout(() => {
      const calculated = calculateScoreBreakdown(witnesses, evidence, basicInfo);
      setScore(calculated);
      setImprovements(generateImprovements(calculated, witnesses, evidence));
      setIsCalculating(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [witnesses, evidence, basicInfo]);

  if (isCalculating || !score) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <p className="mt-4 text-zinc-400">Calculating quality score...</p>
      </div>
    );
  }

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
              {score.total.toFixed(1)}
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

      {/* Score Breakdown */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h3 className="font-semibold text-zinc-200 mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Witness Credibility', value: score.witnessCredibility, max: 2.0 },
            { label: 'Documentation Timing', value: score.documentationTiming, max: 2.0 },
            { label: 'Evidence Quality', value: score.evidenceQuality, max: 2.0 },
            { label: 'Corroboration', value: score.corroboration, max: 2.0 },
            { label: 'Verifiability', value: score.verifiability, max: 2.0 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="w-40 text-sm text-zinc-400">{item.label}</div>
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

        {/* Bonuses */}
        {score.bonusesApplied.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <div className="text-sm text-zinc-400 mb-2">Bonuses Applied:</div>
            <div className="space-y-1">
              {score.bonusesApplied.map((bonus, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-emerald-400">+ {bonus.name}</span>
                  <span className="text-emerald-400">+{bonus.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {score.bonusesNotApplied.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <div className="text-sm text-zinc-400 mb-2">Bonuses Not Applied:</div>
            <div className="space-y-2">
              {score.bonusesNotApplied.map((bonus, i) => (
                <div key={i} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">○ {bonus.name}</span>
                    <span className="text-zinc-500">+{bonus.value.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-amber-400 ml-4">{bonus.reason}</div>
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
                    <span className={`text-xs ${
                      imp.difficulty === 'easy' ? 'text-emerald-400' :
                      imp.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {imp.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
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
