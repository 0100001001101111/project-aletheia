import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// POST /api/submissions/submit - Submit draft as investigation
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json();

    // Get or create user ID
    let userId = user?.id;

    if (!userId) {
      // Create anonymous user
      const { data: anonUser, error: anonError } = await supabase
        .from('aletheia_users')
        .insert({
          display_name: 'Anonymous Submitter',
          identity_type: 'anonymous_unverified',
          verification_level: 'none',
        })
        .select()
        .single();

      if (anonError) {
        console.error('Anonymous user creation error:', anonError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      userId = anonUser.id;
    }

    // Calculate estimated score (simplified)
    const witnesses = body.witnesses || [];
    const evidence = body.evidence || [];

    let estimatedScore = 0;

    // Witness scoring
    const verifiedProfessionals = witnesses.filter(
      (w: { identityType: string; verificationStatus: string }) =>
        (w.identityType === 'named_professional' || w.identityType === 'named_official') &&
        w.verificationStatus === 'independently_verified'
    );

    if (verifiedProfessionals.length >= 3) estimatedScore += 2.0;
    else if (verifiedProfessionals.length >= 1) estimatedScore += 1.5;
    else if (witnesses.length >= 1) estimatedScore += 0.5;

    // Evidence scoring
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
      const avgWeight = evidence.reduce(
        (sum: number, e: { category: string }) => sum + (CATEGORY_WEIGHTS[e.category] || 0.3),
        0
      ) / evidence.length;
      estimatedScore += avgWeight * 2;
    }

    // Corroboration
    if (witnesses.length >= 6) estimatedScore += 2.0;
    else if (witnesses.length >= 3) estimatedScore += 1.5;
    else if (witnesses.length >= 2) estimatedScore += 1.0;
    else estimatedScore += 0.3;

    // Verifiability
    const verifiedWitnesses = witnesses.filter(
      (w: { verificationStatus: string }) => w.verificationStatus === 'independently_verified'
    );
    const verifiedEvidence = evidence.filter((e: { independentlyVerified: boolean }) => e.independentlyVerified);

    if (verifiedWitnesses.length >= 2 && verifiedEvidence.length >= 2) estimatedScore += 2.0;
    else if (verifiedWitnesses.length >= 1 || verifiedEvidence.length >= 1) estimatedScore += 1.0;
    else estimatedScore += 0.4;

    estimatedScore = Math.min(10, estimatedScore);

    // Determine tier
    let tier: 'verified' | 'provisional' | 'rejected';
    let triageStatus: 'verified' | 'provisional' | 'rejected';

    if (estimatedScore >= 8.0) {
      tier = 'verified';
      triageStatus = 'verified';
    } else if (estimatedScore >= 4.0) {
      tier = 'provisional';
      triageStatus = 'provisional';
    } else {
      tier = 'rejected';
      triageStatus = 'rejected';
    }

    // Build raw_data from submission
    const rawData = {
      basicInfo: body.basicInfo,
      witnesses: body.witnesses,
      domainData: body.domainData,
      evidence: body.evidence?.map((e: { file?: unknown; [key: string]: unknown }) => {
        // Remove file objects (can't store in JSONB)
        const { file, ...rest } = e;
        return rest;
      }),
      environmentalData: body.environmentalData,
      scoreBreakdown: {
        estimatedScore,
        tier,
        calculatedAt: new Date().toISOString(),
      },
    };

    // Apply simple mode cap if applicable
    const isSimpleMode = body.submissionMode === 'simple';
    if (isSimpleMode) {
      // Cap simple mode submissions at 6.0
      estimatedScore = Math.min(estimatedScore, 6.0);
      // Simple mode can only reach provisional at best
      if (tier === 'verified') {
        tier = 'provisional';
        triageStatus = 'provisional';
      }
    }

    // Create investigation
    const { data: investigation, error: invError } = await supabase
      .from('aletheia_investigations')
      .insert({
        user_id: userId,
        investigation_type: body.investigationType,
        title: body.basicInfo?.title || 'Untitled Investigation',
        description: body.basicInfo?.summary || '',
        raw_data: rawData,
        raw_narrative: body.basicInfo?.summary,
        triage_score: Math.round(estimatedScore),
        triage_status: triageStatus,
        submission_mode: isSimpleMode ? 'simple' : 'full',
      })
      .select()
      .single();

    if (invError) {
      console.error('Investigation creation error:', invError);
      return NextResponse.json({ error: 'Failed to create investigation' }, { status: 500 });
    }

    // Mark draft as submitted if draftId provided
    if (body.draftId) {
      await supabase
        .from('aletheia_submission_drafts')
        .update({ status: 'submitted' })
        .eq('id', body.draftId);
    }

    // Create contribution record
    await supabase
      .from('aletheia_contributions')
      .insert({
        user_id: userId,
        investigation_id: investigation.id,
        contribution_type: 'submission',
        credibility_points_earned: estimatedScore >= 8 ? 10 : estimatedScore >= 4 ? 5 : 1,
      });

    return NextResponse.json({
      id: investigation.id,
      estimatedScore,
      tier,
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
