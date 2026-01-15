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
  const supabase = createClient();

  // Fetch Aletheia user profile from database
  const fetchUserProfile = useCallback(
    async (authUser: SupabaseUser): Promise<AletheiaUser | null> => {
      const { data: profile, error } = await supabase
        .from('aletheia_users')
        .select('*')
        .eq('id', authUser.id)
        .single() as { data: Omit<AletheiaUser, 'authUser' | 'isEmailVerified'> | null; error: unknown };

      if (error || !profile) {
        console.error('Failed to fetch user profile:', error);
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

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const aletheiaUser = await fetchUserProfile(session.user);
          setUser(aletheiaUser);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const aletheiaUser = await fetchUserProfile(session.user);
        setUser(aletheiaUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'USER_UPDATED' && session?.user) {
        const aletheiaUser = await fetchUserProfile(session.user);
        setUser(aletheiaUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);

  // =====================================================
  // AUTH METHODS
  // =====================================================

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
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

      // Create Aletheia user profile
      const { error: profileError } = await (supabase.from('aletheia_users') as ReturnType<typeof supabase.from>).insert({
        id: authData.user.id,
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
        id: authData.user.id,
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
