/**
 * Project Aletheia - Auth Utilities
 */

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, VerificationLevel, IdentityType } from '../types/database';

// =====================================================
// TYPES
// =====================================================

export interface AletheiaUser extends User {
  authUser: SupabaseUser | null;
  isEmailVerified: boolean;
}

export interface AuthState {
  user: AletheiaUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// =====================================================
// ANONYMOUS ID GENERATION
// =====================================================

/**
 * Generate a unique anonymous ID
 * Format: ANON-XXXXXX (6 alphanumeric chars)
 */
export function generateAnonymousId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ANON-${id.toUpperCase()}`;
}

/**
 * Generate anonymous email for Supabase auth
 * Uses the anonymous ID as a fake email domain
 */
export function generateAnonymousEmail(anonId: string): string {
  return `${anonId.toLowerCase()}@anonymous.aletheia.local`;
}

/**
 * Check if an email is an anonymous placeholder
 */
export function isAnonymousEmail(email: string | null | undefined): boolean {
  return email?.endsWith('@anonymous.aletheia.local') ?? false;
}

/**
 * Extract anonymous ID from anonymous email
 */
export function extractAnonymousId(email: string): string | null {
  if (!isAnonymousEmail(email)) return null;
  const id = email.split('@')[0].toUpperCase();
  return id.startsWith('ANON-') ? id : `ANON-${id}`;
}

// =====================================================
// PERMISSION CHECKS
// =====================================================

/**
 * Check if user can submit investigation data
 * - Public users with verified email: yes
 * - Anonymous verified: yes (provisional status)
 * - Anonymous unverified: limited (provisional status, rate limited)
 */
export function canSubmitData(user: AletheiaUser | null): boolean {
  if (!user) return false;

  // Public users need verified email
  if (user.identity_type === 'public') {
    return user.isEmailVerified;
  }

  // Anonymous users can submit (with restrictions applied elsewhere)
  return true;
}

/**
 * Check if user submissions should be auto-provisional
 * Anonymous users always submit as provisional
 */
export function submitsAsProvisional(user: AletheiaUser | null): boolean {
  if (!user) return true;
  return user.identity_type !== 'public' || !user.isEmailVerified;
}

/**
 * Check if user can review/triage submissions
 * Requires PhD or researcher verification level
 */
export function canReviewSubmissions(user: AletheiaUser | null): boolean {
  if (!user) return false;
  return user.verification_level === 'phd' || user.verification_level === 'researcher';
}

/**
 * Check if user has admin privileges
 * Requires PhD verification level
 */
export function isAdmin(user: AletheiaUser | null): boolean {
  if (!user) return false;
  return user.verification_level === 'phd';
}

/**
 * Check if user can claim a verification level
 * Everyone can claim, but it remains unverified until ZKP/manual verification
 */
export function canClaimVerification(user: AletheiaUser | null): boolean {
  if (!user) return false;
  return user.verification_level === 'none';
}

// =====================================================
// DISPLAY HELPERS
// =====================================================

/**
 * Get display name for user
 * Handles anonymous users showing their ANON-XXXXXX ID
 */
export function getDisplayName(user: AletheiaUser | null): string {
  if (!user) return 'Guest';

  if (user.identity_type !== 'public' && user.email) {
    const anonId = extractAnonymousId(user.email);
    if (anonId) return anonId;
  }

  return user.display_name || 'Anonymous';
}

/**
 * Get identity type label for display
 */
export function getIdentityTypeLabel(type: IdentityType): string {
  switch (type) {
    case 'public':
      return 'Public Researcher';
    case 'anonymous_verified':
      return 'Anonymous (Verified)';
    case 'anonymous_unverified':
      return 'Anonymous';
    default:
      return 'Unknown';
  }
}

/**
 * Get verification level label for display
 */
export function getVerificationLabel(level: VerificationLevel): string {
  switch (level) {
    case 'phd':
      return 'PhD / Doctorate';
    case 'researcher':
      return 'Academic Researcher';
    case 'lab_tech':
      return 'Lab Technician';
    case 'independent':
      return 'Independent Researcher';
    case 'none':
      return 'Unverified';
    default:
      return 'Unknown';
  }
}

/**
 * Get credibility score display color
 */
export function getCredibilityColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-zinc-500';
}

/**
 * Format credibility score for display
 */
export function formatCredibilityScore(score: number): string {
  return score.toFixed(1);
}

// =====================================================
// RATE LIMITING (Client-side tracking)
// =====================================================

const SUBMISSION_LIMITS = {
  public: { count: 10, windowMs: 3600000 }, // 10 per hour
  anonymous_verified: { count: 5, windowMs: 3600000 }, // 5 per hour
  anonymous_unverified: { count: 2, windowMs: 3600000 }, // 2 per hour
};

/**
 * Get submission rate limit for user type
 */
export function getSubmissionLimit(identityType: IdentityType) {
  return SUBMISSION_LIMITS[identityType];
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters, at least one number
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Validate display name
 * 2-50 characters, alphanumeric and spaces
 */
export function isValidDisplayName(name: string): { valid: boolean; message?: string } {
  if (name.length < 2) {
    return { valid: false, message: 'Display name must be at least 2 characters' };
  }
  if (name.length > 50) {
    return { valid: false, message: 'Display name must be 50 characters or less' };
  }
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(name)) {
    return { valid: false, message: 'Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods' };
  }
  return { valid: true };
}
