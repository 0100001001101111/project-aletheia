/**
 * Email Templates for Project Aletheia
 * Templates for submission notifications, challenges, and updates
 */

import type { ScoreTier } from '@/types/submission';

// ============================================================================
// Email Template Types
// ============================================================================

export type EmailType =
  | 'submission_received'
  | 'verified'
  | 'provisional'
  | 'rejected'
  | 'challenge_filed'
  | 'challenge_dismissed'
  | 'challenge_upheld'
  | 'pattern_match'
  | 'prediction_update'
  | 'weekly_digest'
  | 'related_investigation'
  | 'welcome';

interface BaseEmailData {
  userName: string;
  userEmail: string;
}

export interface SubmissionReceivedData extends BaseEmailData {
  investigationId: string;
  investigationTitle: string;
  estimatedScore: number;
  tier: ScoreTier;
  dashboardLink: string;
}

export interface VerifiedData extends BaseEmailData {
  investigationTitle: string;
  finalScore: number;
  patternMatches: Array<{
    name: string;
    matchPercentage: number;
    description: string;
  }>;
  environmentalSummary: string;
  investigationLink: string;
}

export interface ProvisionalData extends BaseEmailData {
  investigationTitle: string;
  finalScore: number;
  scoreBreakdown: {
    witnessCredibility: number;
    documentationTiming: number;
    evidenceQuality: number;
    corroboration: number;
    verifiability: number;
  };
  suggestions: Array<{
    action: string;
    potentialBoost: number;
  }>;
  patternMatches: Array<{
    name: string;
    matchPercentage: number;
  }>;
  editLink: string;
}

export interface RejectedData extends BaseEmailData {
  investigationTitle: string;
  finalScore: number;
  redFlags: string[];
  suggestions: string[];
  rigorGuideLink: string;
  exampleLink: string;
  resubmitLink: string;
}

export interface ChallengeFiledData extends BaseEmailData {
  investigationTitle: string;
  flagType: string;
  challengerName: string;
  challengerMethodologyPoints: number;
  flagDescription: string;
  deadline: string;
  responseLink: string;
}

export interface WeeklyDigestData extends BaseEmailData {
  dateRange: string;
  investigations: Array<{
    title: string;
    score: number;
    tier: ScoreTier;
    views: number;
    patternCount: number;
  }>;
  activities: string[];
  platformStats: {
    newInvestigations: number;
    newPatterns: number;
    predictionsUpdated: number;
  };
  userStats: {
    methodologyPoints: number;
    credibilityScore: number;
    percentileRank: number;
  };
  suggestions?: string[];
  dashboardLink: string;
}

// ============================================================================
// Email Template Functions
// ============================================================================

export function generateSubmissionReceivedEmail(data: SubmissionReceivedData): {
  subject: string;
  body: string;
} {
  const tierLabel = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);

  return {
    subject: `Submission Received - ${data.investigationTitle}`,
    body: `Hi ${data.userName},

Your investigation has been received and is being processed.

Investigation ID: ${data.investigationId}
Title: ${data.investigationTitle}
Estimated Score: ${data.estimatedScore.toFixed(1)}/10 (${tierLabel})

WHAT HAPPENS NEXT:
1. AI Review (1-24 hours)
   - Validate data integrity
   - Cross-reference environmental data
   - Check for duplicates

2. Pattern Matching (if score 4+)
   - Compare against 200+ investigations
   - Identify cross-domain correlations

3. Results Email (within 48 hours)
   - Final score and tier
   - Pattern matches found
   - Improvement suggestions

Track your submission: ${data.dashboardLink}

- Project Aletheia`,
  };
}

export function generateVerifiedEmail(data: VerifiedData): {
  subject: string;
  body: string;
} {
  const patternsSection = data.patternMatches.length > 0
    ? `PATTERN MATCHES FOUND:
${data.patternMatches.map(p => `• ${p.name} (${p.matchPercentage}% match)
  ${p.description}`).join('\n')}`
    : 'PATTERN MATCHES: None yet - your investigation will be included in future pattern analysis.';

  return {
    subject: `✓ Verified - ${data.investigationTitle}`,
    body: `Hi ${data.userName},

Your investigation has been VERIFIED.

FINAL SCORE: ${data.finalScore.toFixed(1)}/10

Your submission meets our highest quality standards and will
contribute to prediction testing and pattern analysis.

${patternsSection}

ENVIRONMENTAL CORRELATIONS:
${data.environmentalSummary}

Your investigation is now live: ${data.investigationLink}

Thank you for contributing rigorous research.

- Project Aletheia`,
  };
}

export function generateProvisionalEmail(data: ProvisionalData): {
  subject: string;
  body: string;
} {
  const breakdown = data.scoreBreakdown;

  return {
    subject: `Provisional - ${data.investigationTitle}`,
    body: `Hi ${data.userName},

Your investigation has been accepted as PROVISIONAL.

FINAL SCORE: ${data.finalScore.toFixed(1)}/10

Your submission is visible in Community Findings but won't
contribute to prediction confirmation until the score improves.

SCORE BREAKDOWN:
• Witness Credibility: ${breakdown.witnessCredibility.toFixed(1)}/2.0
• Documentation Timing: ${breakdown.documentationTiming.toFixed(1)}/2.0
• Evidence Quality: ${breakdown.evidenceQuality.toFixed(1)}/2.0
• Corroboration: ${breakdown.corroboration.toFixed(1)}/2.0
• Verifiability: ${breakdown.verifiability.toFixed(1)}/2.0

HOW TO REACH VERIFIED STATUS:
${data.suggestions.map(s => `☐ ${s.action} (+${s.potentialBoost.toFixed(1)})`).join('\n')}

PATTERN MATCHES (preliminary):
${data.patternMatches.map(p => `• ${p.name} (${p.matchPercentage}% match)`).join('\n') || 'None detected yet'}

Edit your submission: ${data.editLink}

- Project Aletheia`,
  };
}

export function generateRejectedEmail(data: RejectedData): {
  subject: string;
  body: string;
} {
  return {
    subject: `Submission Needs Work - ${data.investigationTitle}`,
    body: `Hi ${data.userName},

Your investigation didn't meet our minimum quality threshold.

SCORE: ${data.finalScore.toFixed(1)}/10 (minimum required: 4.0)

This doesn't mean your research isn't valuable - it means we
need more documentation to include it in our analysis.

MAIN ISSUES:
${data.redFlags.map(f => `• ${f}`).join('\n')}

HOW TO FIX:
${data.suggestions.map(s => `☐ ${s}`).join('\n')}

RESOURCES:
• Rigor-Up Guide: ${data.rigorGuideLink}
• Example verified submission: ${data.exampleLink}

Ready to try again? ${data.resubmitLink}

- Project Aletheia`,
  };
}

export function generateWeeklyDigestEmail(data: WeeklyDigestData): {
  subject: string;
  body: string;
} {
  const investigationsSection = data.investigations.length > 0
    ? `YOUR INVESTIGATIONS:
${data.investigations.map(i => `• ${i.title} - ${i.score.toFixed(1)}/10 (${i.tier})
  Views: ${i.views} | Pattern matches: ${i.patternCount}`).join('\n')}`
    : 'YOUR INVESTIGATIONS: No active investigations';

  const activitySection = data.activities.length > 0
    ? `ACTIVITY ON YOUR SUBMISSIONS:
${data.activities.map(a => `• ${a}`).join('\n')}`
    : '';

  const suggestionsSection = data.suggestions && data.suggestions.length > 0
    ? `RECOMMENDED ACTIONS:
${data.suggestions.map(s => `• ${s}`).join('\n')}`
    : '';

  return {
    subject: `Your Aletheia Weekly - ${data.dateRange}`,
    body: `Hi ${data.userName},

Here's what happened this week:

${investigationsSection}

${activitySection}

PLATFORM HIGHLIGHTS:
• New investigations: ${data.platformStats.newInvestigations}
• New patterns discovered: ${data.platformStats.newPatterns}
• Predictions updated: ${data.platformStats.predictionsUpdated}

YOUR STATS:
• Methodology Points: ${data.userStats.methodologyPoints}
• Credibility Score: ${data.userStats.credibilityScore.toFixed(1)}/10
• Platform Rank: Top ${data.userStats.percentileRank}%

${suggestionsSection}

View your dashboard: ${data.dashboardLink}

- Project Aletheia`,
  };
}

export function generateWelcomeEmail(data: BaseEmailData & { baseUrl: string }): {
  subject: string;
  body: string;
} {
  return {
    subject: 'Welcome to Project Aletheia',
    body: `Hi ${data.userName},

Welcome to rigorous anomaly research.

WHAT WE DO:
We test claims about anomalous phenomena using scientific methods.
No belief required - just data, patterns, and predictions.

GET STARTED:
1. Browse existing investigations across 6 domains
2. Learn how our scoring system works
3. Submit your own research
4. Help test predictions through replication

OUR DOMAINS:
• Near-Death Experience (NDE)
• Ganzfeld / Telepathy
• Crisis Apparition
• Remote Viewing (STARGATE)
• Geophysical Anomaly
• UAP / Close Encounter (BETA)

RESOURCES:
• How scoring works: ${data.baseUrl}/guide/scoring
• Submission guide: ${data.baseUrl}/guide/submission
• Example investigations: ${data.baseUrl}/investigations?examples=true

Questions? Reply to this email.

- Project Aletheia
We don't chase ghosts. We find patterns.`,
  };
}

// ============================================================================
// Notification Type Helpers
// ============================================================================

export function getNotificationTitle(type: EmailType, investigationTitle?: string): string {
  switch (type) {
    case 'submission_received':
      return `Submission Received - ${investigationTitle}`;
    case 'verified':
      return `Verified - ${investigationTitle}`;
    case 'provisional':
      return `Provisional - ${investigationTitle}`;
    case 'rejected':
      return `Needs Work - ${investigationTitle}`;
    case 'challenge_filed':
      return `Challenge Filed - ${investigationTitle}`;
    case 'challenge_dismissed':
      return `Challenge Dismissed - ${investigationTitle}`;
    case 'challenge_upheld':
      return `Challenge Upheld - ${investigationTitle}`;
    case 'pattern_match':
      return 'New Pattern Match';
    case 'prediction_update':
      return 'Prediction Updated';
    case 'weekly_digest':
      return 'Your Weekly Digest';
    case 'related_investigation':
      return 'Related Investigation Submitted';
    case 'welcome':
      return 'Welcome to Project Aletheia';
    default:
      return 'Notification';
  }
}
