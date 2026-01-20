'use client';

/**
 * ActivityFeed
 * Displays recent activity related to user's investigations
 */

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  link?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

function getActivityIcon(type: string): JSX.Element {
  switch (type) {
    case 'pattern_match':
      return (
        <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case 'related_investigation':
      return (
        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case 'challenge_filed':
      return (
        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'challenge_dismissed':
      return (
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'prediction_update':
      return (
        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'verified':
      return (
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h3 className="font-semibold text-zinc-200 mb-4">Activity Feed</h3>
        <p className="text-sm text-zinc-500 text-center py-4">
          No recent activity. Submit an investigation to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
      <h3 className="font-semibold text-zinc-200 mb-4">Activity Feed</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-300">
                {activity.link ? (
                  <Link href={activity.link} className="hover:text-violet-400 transition-colors">
                    {activity.description}
                  </Link>
                ) : (
                  activity.description
                )}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * UserStatsCard
 * Displays user statistics in a compact card
 */
interface UserStats {
  submissionCount: number;
  verifiedCount: number;
  methodologyPoints: number;
  percentileRank: number;
}

interface UserStatsCardProps {
  stats: UserStats;
}

export function UserStatsCard({ stats }: UserStatsCardProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-center">
        <div className="text-2xl font-bold text-zinc-100">{stats.submissionCount}</div>
        <div className="text-xs text-zinc-500 mt-1">Submissions</div>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-center">
        <div className="text-2xl font-bold text-emerald-400">{stats.verifiedCount}</div>
        <div className="text-xs text-zinc-500 mt-1">Verified</div>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-center">
        <div className="text-2xl font-bold text-violet-400">{stats.methodologyPoints}</div>
        <div className="text-xs text-zinc-500 mt-1">MP</div>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-center">
        <div className="text-2xl font-bold text-amber-400">Top {stats.percentileRank}%</div>
        <div className="text-xs text-zinc-500 mt-1">Rank</div>
      </div>
    </div>
  );
}

/**
 * InvestigationCard
 * Displays a single investigation in the dashboard
 */
interface Investigation {
  id: string;
  title: string;
  investigationType: string;
  triageScore: number;
  triageStatus: string;
  viewCount: number;
  patternMatchCount: number;
  activeChallenges: number;
  updatedAt: string;
}

interface InvestigationCardProps {
  investigation: Investigation;
}

export function InvestigationCard({ investigation }: InvestigationCardProps) {
  const statusColors: Record<string, string> = {
    verified: 'text-emerald-400 bg-emerald-500/10',
    provisional: 'text-amber-400 bg-amber-500/10',
    rejected: 'text-red-400 bg-red-500/10',
    pending: 'text-zinc-400 bg-zinc-500/10',
  };

  const status = investigation.triageStatus || 'pending';
  const statusColor = statusColors[status] || statusColors.pending;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link
            href={`/investigations/${investigation.id}`}
            className="font-medium text-zinc-200 hover:text-violet-400 transition-colors"
          >
            {investigation.title}
          </Link>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span className="capitalize">{investigation.investigationType.replace('_', '/')}</span>
            <span>Score: {investigation.triageScore.toFixed(1)}/10</span>
            <span className={`px-2 py-0.5 rounded ${statusColor} uppercase`}>
              {status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            <span>Patterns: {investigation.patternMatchCount}</span>
            <span>Views: {investigation.viewCount}</span>
            {investigation.activeChallenges > 0 && (
              <span className="text-red-400">
                {investigation.activeChallenges} active challenge(s)
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/investigations/${investigation.id}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            View
          </Link>
          <Link
            href={`/investigations/${investigation.id}/edit`}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * DraftCard
 * Displays a draft in progress
 */
interface Draft {
  id: string;
  investigationType: string | null;
  title: string | null;
  currentStep: number;
  updatedAt: string;
}

interface DraftCardProps {
  draft: Draft;
  onDelete?: (id: string) => void;
}

export function DraftCard({ draft, onDelete }: DraftCardProps) {
  const totalSteps = 7;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-zinc-300">
            {draft.title || 'Untitled Draft'}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>Step {draft.currentStep} of {totalSteps}</span>
            <span>•</span>
            <span>Last edited {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-zinc-700 overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${(draft.currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <Link
            href={`/submit?draft=${draft.id}`}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            Continue
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(draft.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PatternMatchCard
 * Displays a pattern match involving user's data
 */
interface PatternMatch {
  patternId: string;
  patternName: string;
  investigationCount: number;
  predictionCount: number;
  matchStrength: number;
}

interface PatternMatchCardProps {
  pattern: PatternMatch;
}

export function PatternMatchCard({ pattern }: PatternMatchCardProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Link
            href={`/patterns/${pattern.patternId}`}
            className="font-medium text-zinc-200 hover:text-violet-400 transition-colors"
          >
            {pattern.patternName}
          </Link>
          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
            <span>{pattern.investigationCount} investigations</span>
            <span>{pattern.predictionCount} predictions</span>
            <span>Your match: {(pattern.matchStrength * 100).toFixed(0)}%</span>
          </div>
        </div>
        <Link
          href={`/patterns/${pattern.patternId}`}
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          View Pattern
        </Link>
      </div>
    </div>
  );
}
