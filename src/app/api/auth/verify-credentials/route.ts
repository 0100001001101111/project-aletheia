/**
 * Credential Verification API
 * Placeholder for ZKP-based credential verification
 *
 * In production, this would integrate with:
 * - University credential verification services
 * - ZK proof systems for anonymous verification
 * - Academic database lookups
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import type { VerificationLevel } from '../../../../types/database';

interface VerifyCredentialsRequest {
  verificationLevel: VerificationLevel;
  proof?: string; // ZKP proof data (future implementation)
  metadata?: {
    institution?: string;
    degree?: string;
    fieldOfStudy?: string;
  };
}

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 attempts per hour
const RATE_LIMIT_WINDOW = 3600000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body: VerifyCredentialsRequest = await request.json();
    const { verificationLevel, proof, metadata } = body;

    // Validate verification level
    const validLevels: VerificationLevel[] = ['phd', 'researcher', 'lab_tech', 'independent'];
    if (!validLevels.includes(verificationLevel)) {
      return NextResponse.json(
        { error: 'Invalid verification level' },
        { status: 400 }
      );
    }

    // Get current user profile
    type IdentityType = 'public' | 'anonymous_verified' | 'anonymous_unverified';
    const { data: profile, error: profileError } = await supabase
      .from('aletheia_users')
      .select('*')
      .eq('auth_id', user.id)
      .single() as { data: { id: string; identity_type: IdentityType; verification_level: string } | null; error: unknown };

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // =========================================
    // PLACEHOLDER: ZKP Verification Logic
    // =========================================
    //
    // In a production system, this section would:
    //
    // 1. Verify ZKP proof against credential schema
    //    const isValidProof = await verifyZKProof(proof, verificationLevel);
    //
    // 2. Check against credential issuer registry
    //    const issuerValid = await checkCredentialIssuer(metadata?.institution);
    //
    // 3. Verify proof hasn't been used before (prevent replay)
    //    const isUniqueProof = await checkProofUniqueness(proof);
    //
    // 4. For PhD: verify against academic database
    //    const phdValid = await verifyPhdCredential(metadata);
    //
    // For now, we store the claim as "pending verification"
    // and allow manual review by admins
    // =========================================

    // For now, store the claim without verification
    // This creates a "claimed but unverified" state
    const updateData: {
      verification_level: VerificationLevel;
      identity_type: 'public' | 'anonymous_verified' | 'anonymous_unverified';
    } = {
      verification_level: verificationLevel,
      identity_type: profile.identity_type === 'anonymous_unverified'
        ? 'anonymous_verified'
        : profile.identity_type,
    };

    const { error: updateError } = await (supabase
      .from('aletheia_users') as ReturnType<typeof supabase.from>)
      .update(updateData as Record<string, unknown>)
      .eq('auth_id', user.id);

    if (updateError) {
      console.error('Failed to update user verification:', updateError);
      return NextResponse.json(
        { error: 'Failed to update verification status' },
        { status: 500 }
      );
    }

    // Log verification attempt for audit trail
    // Store in contributions table as a special type for now
    await (supabase
      .from('aletheia_contributions') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: profile.id,
        contribution_type: 'submission', // Using existing enum value
        credibility_points_earned: 0,
        notes: `Credential claim: ${verificationLevel}${metadata?.institution ? ` (${metadata.institution})` : ''}${metadata?.degree ? `, ${metadata.degree}` : ''} - PENDING VERIFICATION`,
      } as Record<string, unknown>);

    console.log(`[AUDIT] User ${profile.id} claimed verification level: ${verificationLevel}`);

    return NextResponse.json({
      success: true,
      message: 'Credential claim submitted. Verification is pending admin review.',
      verification_level: verificationLevel,
      status: 'pending',
      warning: 'Credentials are not automatically verified. False claims may result in account restrictions.',
    });

  } catch (error) {
    console.error('Verify credentials error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get current verification status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('aletheia_users')
      .select('verification_level, identity_type')
      .eq('auth_id', user.id)
      .single() as { data: { verification_level: string; identity_type: string } | null; error: unknown };

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verification_level: profile.verification_level,
      identity_type: profile.identity_type,
      is_verified: profile.verification_level !== 'none',
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
