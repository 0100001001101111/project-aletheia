/**
 * Project Aletheia - Supabase Client Setup
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Environment variables (set these in your .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase client for browser/client-side usage
 * Uses anon key with RLS policies for security
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Create a Supabase client with service role key for server-side operations
 * WARNING: Only use this in server-side code (API routes, server components)
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =====================================================
// TYPE-SAFE QUERY HELPERS
// =====================================================

/** Helper type for Supabase query results */
export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

/** Helper type for Supabase array query results */
export type QueryArrayResult<T> = {
  data: T[] | null;
  error: Error | null;
};

// =====================================================
// TABLE NAME CONSTANTS
// =====================================================

export const TABLES = {
  USERS: 'aletheia_users',
  INVESTIGATIONS: 'aletheia_investigations',
  PREDICTIONS: 'aletheia_predictions',
  PATTERN_MATCHES: 'aletheia_pattern_matches',
  CONTRIBUTIONS: 'aletheia_contributions',
  TRIAGE_REVIEWS: 'aletheia_triage_reviews',
} as const;

// =====================================================
// COMMON QUERIES
// =====================================================

/**
 * Fetch verified investigations with pagination
 */
export async function getVerifiedInvestigations(
  page = 1,
  limit = 20,
  type?: Database['public']['Enums']['aletheia_investigation_type']
) {
  let query = supabase
    .from(TABLES.INVESTIGATIONS)
    .select('*, user:aletheia_users(id, display_name, verification_level)')
    .eq('triage_status', 'verified')
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (type) {
    query = query.eq('investigation_type', type);
  }

  return query;
}

/**
 * Fetch all predictions ordered by confidence
 */
export async function getPredictions(status?: Database['public']['Enums']['aletheia_prediction_status']) {
  let query = supabase
    .from(TABLES.PREDICTIONS)
    .select('*')
    .order('confidence_score', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  return query;
}

/**
 * Fetch pattern matches above a confidence threshold
 */
export async function getPatternMatches(minConfidence = 0.5) {
  return supabase
    .from(TABLES.PATTERN_MATCHES)
    .select('*, prediction:aletheia_predictions(*)')
    .gte('confidence_score', minConfidence)
    .order('confidence_score', { ascending: false });
}

/**
 * Fetch a user's contributions with investigation details
 */
export async function getUserContributions(userId: string) {
  return supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*, investigation:aletheia_investigations(id, title, investigation_type)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

/**
 * Get cross-domain statistics
 */
export async function getDomainStatistics() {
  return supabase
    .from(TABLES.INVESTIGATIONS)
    .select('type')
    .eq('triage_status', 'verified');
}

/**
 * Submit a new investigation
 */
export async function submitInvestigation(
  investigation: Database['public']['Tables']['aletheia_investigations']['Insert']
) {
  return (supabase
    .from(TABLES.INVESTIGATIONS) as ReturnType<typeof supabase.from>)
    .insert(investigation as never)
    .select()
    .single();
}

/**
 * Create a triage review for an investigation
 */
export async function createTriageReview(
  review: Database['public']['Tables']['aletheia_triage_reviews']['Insert']
) {
  return (supabase
    .from(TABLES.TRIAGE_REVIEWS) as ReturnType<typeof supabase.from>)
    .insert(review as never)
    .select()
    .single();
}

// =====================================================
// AUTH HELPERS
// =====================================================

/**
 * Get or create an Aletheia user profile for the current auth user
 */
export async function getOrCreateUserProfile(displayName?: string) {
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return { data: null, error: new Error('Not authenticated') };
  }

  // Check if user profile exists
  const { data: existingUser, error: fetchError } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (existingUser) {
    return { data: existingUser, error: null };
  }

  // Create new profile
  const { data: newUser, error: insertError } = await (supabase
    .from(TABLES.USERS) as ReturnType<typeof supabase.from>)
    .insert({
      id: authUser.id,
      email: authUser.email,
      display_name: displayName || authUser.email?.split('@')[0] || 'Anonymous',
      identity_type: authUser.email ? 'anonymous_verified' : 'anonymous_unverified',
    } as never)
    .select()
    .single();

  return { data: newUser, error: insertError };
}
