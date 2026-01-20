import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  hashSubmissionState,
  detectChanges,
  checkForGaming,
  calculateGamingRisk,
  type GamingFlag,
  type ChangeRecord,
} from '@/lib/anti-gaming';
import type { Witness } from '@/components/submission/WitnessesForm';
import type { EvidenceItem } from '@/components/submission/EvidenceForm';

type CookieToSet = { name: string; value: string; options: CookieOptions };

interface ScoreAuditRequest {
  draftId: string;
  witnesses: Witness[];
  evidence: EvidenceItem[];
  score: {
    finalScore: number;
    tier: string;
    breakdown: {
      witnessCredibility: number;
      documentationTiming: number;
      evidenceQuality: number;
      corroboration: number;
      verifiability: number;
    };
  };
}

// POST /api/submissions/score-audit - Log score estimate and check for gaming
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
    const sessionId = cookieStore.get('draft_session')?.value || null;
    const body: ScoreAuditRequest = await request.json();

    // Calculate submission hash
    const submissionHash = hashSubmissionState(body.witnesses, body.evidence);

    // Fetch previous audit entries for this draft
    const { data: previousEntries } = await supabase
      .from('aletheia_score_estimate_audit')
      .select('*')
      .eq('draft_id', body.draftId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Detect changes from previous state
    let changesFromPrevious: ChangeRecord[] = [];
    if (previousEntries && previousEntries.length > 0) {
      const lastEntry = previousEntries[0];
      const prevWitnesses = (lastEntry.submission_state?.witnesses || []) as Witness[];
      const prevEvidence = (lastEntry.submission_state?.evidence || []) as EvidenceItem[];

      changesFromPrevious = detectChanges(
        prevWitnesses,
        prevEvidence,
        body.witnesses,
        body.evidence
      );
    }

    // Build current entry
    const currentEntry = {
      draftId: body.draftId,
      userId: user?.id || null,
      sessionId,
      timestamp: new Date().toISOString(),
      submissionHash,
      estimatedScore: body.score.finalScore,
      tier: body.score.tier,
      breakdown: body.score.breakdown,
      witnessCount: body.witnesses.length,
      evidenceCount: body.evidence.length,
      changesFromPrevious,
    };

    // Check for gaming patterns
    const mappedPreviousEntries = (previousEntries || []).map(e => ({
      draftId: e.draft_id,
      userId: e.user_id,
      sessionId: e.session_id,
      timestamp: e.created_at,
      submissionHash: e.submission_hash,
      estimatedScore: e.estimated_score,
      tier: e.tier,
      breakdown: e.breakdown,
      witnessCount: e.witness_count,
      evidenceCount: e.evidence_count,
      changesFromPrevious: e.changes_from_previous || [],
      flags: e.flags || [],
    }));

    const flags: GamingFlag[] = checkForGaming(currentEntry, mappedPreviousEntries);
    const gamingRisk = calculateGamingRisk(flags);

    // Insert audit log
    const { error: insertError } = await supabase
      .from('aletheia_score_estimate_audit')
      .insert({
        draft_id: body.draftId,
        user_id: user?.id || null,
        session_id: sessionId,
        submission_hash: submissionHash,
        estimated_score: body.score.finalScore,
        tier: body.score.tier,
        breakdown: body.score.breakdown,
        witness_count: body.witnesses.length,
        evidence_count: body.evidence.length,
        changes_from_previous: changesFromPrevious,
        flags,
        gaming_risk_score: gamingRisk,
        submission_state: {
          witnesses: body.witnesses,
          evidence: body.evidence,
        },
      });

    if (insertError) {
      console.error('Score audit insert error:', insertError);
      // Don't fail the request, just log
    }

    // Return flags if any gaming detected
    return NextResponse.json({
      logged: true,
      flags,
      gamingRisk,
      iterationCount: (previousEntries?.length || 0) + 1,
    });
  } catch (error) {
    console.error('Score audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/submissions/score-audit?draftId=xxx - Get audit history for a draft
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');

    if (!draftId) {
      return NextResponse.json({ error: 'draftId required' }, { status: 400 });
    }

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
    const sessionId = cookieStore.get('draft_session')?.value;

    // Verify ownership of draft
    const { data: draft } = await supabase
      .from('aletheia_submission_drafts')
      .select('user_id, session_id')
      .eq('id', draftId)
      .single();

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const isOwner = (user && draft.user_id === user.id) ||
                    (sessionId && draft.session_id === sessionId);

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch audit entries
    const { data: entries, error } = await supabase
      .from('aletheia_score_estimate_audit')
      .select('*')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
    }

    return NextResponse.json({
      entries: entries || [],
      totalIterations: entries?.length || 0,
    });
  } catch (error) {
    console.error('Score audit fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
