'use client';

/**
 * Project Aletheia - Auth Context Provider
 * Provides authentication state and methods throughout the app
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { createClient } from '../lib/supabase-browser';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User, IdentityType, VerificationLevel } from '../types/database';
import {
  type AletheiaUser,
  generateAnonymousId,
  generateAnonymousEmail,
  isAnonymousEmail,
} from '../lib/auth';

// =====================================================
// TYPES
// =====================================================

interface SignupOptions {
  email: string;
  password: string;
  displayName: string;
  identityType: IdentityType;
  verificationLevel?: VerificationLevel;
}

interface AnonymousSignupOptions {
  verificationLevel?: VerificationLevel;
}

interface AuthContextType {
  user: AletheiaUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Auth methods
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  loginWithAnonymousId: (anonId: string, password: string) => Promise<{ error: Error | null }>;
  signup: (options: SignupOptions) => Promise<{ error: Error | null; anonId?: string }>;
  signupAnonymous: (options?: AnonymousSignupOptions) => Promise<{ error: Error | null; anonId: string }>;
  logout: () => Promise<void>;

  // Profile methods
  updateProfile: (updates: Partial<User>) => Promise<{ error: Error | null }>;
  claimVerification: (level: VerificationLevel) => Promise<{ error: Error | null }>;

  // Utility
  refreshUser: () => Promise<void>;
}

// =====================================================
// CONTEXT
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// =====================================================
// PROVIDER
// =====================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AletheiaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch Aletheia user profile from database
  const fetchUserProfile = useCallback(
    async (authUser: SupabaseUser): Promise<AletheiaUser | null> => {
      console.log('[Auth] Fetching profile for:', authUser.id);

      const { data: profile, error, status } = await supabase
        .from('aletheia_users')
        .select('*')
        .eq('auth_id', authUser.id)
        .maybeSingle() as { data: Omit<AletheiaUser, 'authUser' | 'isEmailVerified'> | null; error: unknown; status: number };

      console.log('[Auth] Profile fetch result:', { data: !!profile, error, status });

      if (error || !profile) {
        console.error('[Auth] Profile fetch failed:', error);
        return null;
      }

      return {
        ...profile,
        authUser,
        isEmailVerified: authUser.email_confirmed_at !== null,
      };
    },
    [supabase]
  );

  // Create a profile if one is missing (handles failed signups)
  const createFallbackProfile = useCallback(
    async (authUser: SupabaseUser): Promise<AletheiaUser | null> => {
      const meta = authUser.user_metadata || {};
      const displayName = meta.display_name || authUser.email?.split('@')[0] || 'User';
      const identityType = meta.identity_type || (isAnonymousEmail(authUser.email || '') ? 'anonymous_unverified' : 'public');

      await (supabase.from('aletheia_users') as ReturnType<typeof supabase.from>).insert({
        auth_id: authUser.id,
        email: authUser.email,
        display_name: displayName,
        identity_type: identityType,
        verification_level: 'none',
        credibility_score: 0,
      } as never);

      return fetchUserProfile(authUser);
    },
    [supabase, fetchUserProfile]
  );

  // Initialize auth state and subscribe to changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event);

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Only fetch profile if user isn't already set (login() handles its own case)
      if (!user && session?.user) {
        const profile = await fetchUserProfile(session.user);
        if (profile) setUser(profile);
      }

      setIsLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user).then(profile => {
          if (profile) setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // =====================================================
  // AUTH METHODS
  // =====================================================

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      if (data.user) {
        // Fetch profile directly — don't rely on onAuthStateChange timing
        const { data: profile, error: profileError } = await supabase
          .from('aletheia_users')
          .select('*')
          .eq('auth_id', data.user.id)
          .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

        console.log('[Auth] Login profile fetch:', { profile: !!profile, profileError });

        if (profile) {
          setUser({
            ...profile,
            authUser: data.user,
            isEmailVerified: data.user.email_confirmed_at !== null,
          } as AletheiaUser);
        } else {
          // Fallback: build minimal user from auth data so UI updates
          setUser({
            id: data.user.id,
            auth_id: data.user.id,
            email: data.user.email ?? null,
            display_name: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'User',
            identity_type: 'public',
            verification_level: 'none',
            credibility_score: 0,
            methodology_points: null,
            created_at: data.user.created_at,
            updated_at: data.user.created_at,
            authUser: data.user,
            isEmailVerified: data.user.email_confirmed_at !== null,
          } as AletheiaUser);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const loginWithAnonymousId = async (anonId: string, password: string) => {
    // Convert ANON-XXXXXX to email format
    const normalizedId = anonId.toUpperCase().startsWith('ANON-')
      ? anonId.toUpperCase()
      : `ANON-${anonId.toUpperCase()}`;
    const email = generateAnonymousEmail(normalizedId);

    return login(email, password);
  };

  const signup = async (options: SignupOptions) => {
    const { email, password, displayName, identityType, verificationLevel = 'none' } = options;

    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            identity_type: identityType,
          },
        },
      });

      if (authError) {
        return { error: new Error(authError.message) };
      }

      if (!authData.user) {
        return { error: new Error('Failed to create user') };
      }

      // Check if this is a repeat signup (user already exists)
      // Supabase returns the existing user but with empty identities array
      if (authData.user.identities && authData.user.identities.length === 0) {
        return { error: new Error('An account with this email already exists. Please sign in instead.') };
      }

      // Create Aletheia user profile
      const { error: profileError } = await (supabase.from('aletheia_users') as ReturnType<typeof supabase.from>).insert({
        auth_id: authData.user.id,
        email,
        display_name: displayName,
        identity_type: identityType,
        verification_level: verificationLevel,
        credibility_score: 0,
      } as never);

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        // Auth user was created but profile failed - this is a partial failure
        return { error: new Error('Account created but profile setup failed. Please contact support.') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signupAnonymous = async (options?: AnonymousSignupOptions) => {
    const anonId = generateAnonymousId();
    const email = generateAnonymousEmail(anonId);
    // Generate a random password for anonymous users
    const password = crypto.randomUUID();

    try {
      // Create Supabase auth user with anonymous email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: anonId,
            identity_type: 'anonymous_unverified',
          },
        },
      });

      if (authError) {
        return { error: new Error(authError.message), anonId: '' };
      }

      if (!authData.user) {
        return { error: new Error('Failed to create anonymous user'), anonId: '' };
      }

      // Create Aletheia user profile
      const { error: profileError } = await (supabase.from('aletheia_users') as ReturnType<typeof supabase.from>).insert({
        auth_id: authData.user.id,
        email: email,
        display_name: anonId,
        identity_type: options?.verificationLevel ? 'anonymous_verified' : 'anonymous_unverified',
        verification_level: options?.verificationLevel || 'none',
        credibility_score: 0,
      } as never);

      if (profileError) {
        console.error('Failed to create anonymous user profile:', profileError);
        return { error: new Error('Anonymous account created but profile setup failed.'), anonId };
      }

      // Store password in localStorage for this session only
      // User must save their ANON ID and password to login again
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`aletheia_anon_${anonId}`, password);
      }

      return { error: null, anonId };
    } catch (error) {
      return { error: error as Error, anonId: '' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // =====================================================
  // PROFILE METHODS
  // =====================================================

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error } = await (supabase
        .from('aletheia_users') as ReturnType<typeof supabase.from>)
        .update(updates as never)
        .eq('id', user.id);

      if (error) {
        return { error: new Error((error as { message?: string })?.message || 'Update failed') };
      }

      // Refresh user data
      await refreshUser();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const claimVerification = async (level: VerificationLevel) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    // For now, just store the claim
    // In production, this would trigger a ZKP verification flow
    const updates: Partial<User> = {
      verification_level: level,
      identity_type: user.identity_type === 'anonymous_unverified' ? 'anonymous_verified' : user.identity_type,
    };

    return updateProfile(updates);
  };

  const refreshUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      const aletheiaUser = await fetchUserProfile(authUser);
      setUser(aletheiaUser);
    }
  };

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,

    login,
    loginWithAnonymousId,
    signup,
    signupAnonymous,
    logout,

    updateProfile,
    claimVerification,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
