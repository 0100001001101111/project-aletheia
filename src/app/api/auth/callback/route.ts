/**
 * Auth Callback Route
 * Handles OAuth callbacks and email verification redirects
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle error from OAuth provider
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth-error?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient();

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        new URL(`/auth-error?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    // Check if user profile exists, create if not
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: existingProfile } = await supabase
        .from('aletheia_users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!existingProfile) {
        // Create profile for OAuth users
        // @ts-expect-error - Supabase types don't fully match our schema
        await supabase.from('aletheia_users').insert({
          auth_id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          identity_type: 'public',
          verification_level: 'none',
          credibility_score: 0,
        });
      }
    }
  }

  // Redirect to the intended destination
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
