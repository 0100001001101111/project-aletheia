/**
 * Untyped Supabase Client for Agent Operations
 * Uses service role key for write operations, anon key for read operations
 * IMPORTANT: Uses lazy initialization to avoid build-time errors
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized singleton clients
let _adminClient: SupabaseClient | null = null;
let _readClient: SupabaseClient | null = null;

/**
 * Get the singleton admin Supabase client (lazy initialized)
 * Uses service role key if available, falls back to anon key
 */
export function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  // Use service role key if available, otherwise fall back to anon key
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _adminClient = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create an untyped Supabase client for agent read operations
 * Uses anon key with RLS (public read access)
 */
export function createAgentReadClient() {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an untyped admin Supabase client for agent write operations
 * Uses service role key for full access (bypasses RLS)
 */
export function createAgentClient() {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - add this to your .env.local file');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
