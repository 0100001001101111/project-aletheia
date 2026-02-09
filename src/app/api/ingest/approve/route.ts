/**
 * Ingest Approve API
 * Validates records against Zod schema and inserts into aletheia_investigations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { validateData, formatZodErrors } from '@/schemas';
import { calculateTriageScore } from '@/lib/triage';
import type { ResearchInvestigationType } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function POST(request: NextRequest) {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { uploadId, recordIds } = body as {
      uploadId: string;
      recordIds: string[];
    };

    if (!uploadId || !recordIds?.length) {
      return NextResponse.json(
        { error: 'uploadId and recordIds are required' },
        { status: 400 },
      );
    }

    // Fetch upload to get schema type (RLS enforces ownership)
    const { data: upload, error: uploadErr } = await supabase
      .from('aletheia_ingest_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadErr || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const schemaType = upload.schema_type as ResearchInvestigationType;

    // Fetch the requested records
    const { data: records, error: recordErr } = await supabase
      .from('aletheia_ingest_records')
      .select('*')
      .eq('upload_id', uploadId)
      .in('id', recordIds);

    if (recordErr || !records) {
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
    }

    let inserted = 0;
    let failed = 0;
    const errors: Array<{ recordId: string; title: string; errors: string[] }> = [];

    for (const record of records) {
      const sourceData = record.edited_data ?? record.parsed_data;

      // Validate against Zod schema
      const validation = validateData(schemaType, sourceData);

      if (!validation.success) {
        failed++;
        errors.push({
          recordId: record.id,
          title: record.title || `Record ${record.record_index}`,
          errors: validation.errors
            ? formatZodErrors(validation.errors).map((e: { path: string; message: string }) => `${e.path}: ${e.message}`)
            : ['Validation failed'],
        });
        continue;
      }

      // Calculate triage score
      const triage = calculateTriageScore(
        sourceData as Record<string, unknown>,
        schemaType,
      );

      // Insert into aletheia_investigations
      const { error: insertErr } = await supabase
        .from('aletheia_investigations')
        .insert({
          investigation_type: schemaType,
          title: record.title || `Ingested: ${upload.filename} #${record.record_index + 1}`,
          raw_data: sourceData,
          triage_score: triage.overall,
          triage_status: triage.status,
          tier: 'research',
          submitted_by: user.id,
        });

      if (insertErr) {
        console.error('Failed to insert investigation:', insertErr);
        failed++;
        errors.push({
          recordId: record.id,
          title: record.title || `Record ${record.record_index}`,
          errors: [insertErr.message],
        });
        continue;
      }

      // Mark record as approved
      await supabase
        .from('aletheia_ingest_records')
        .update({ status: 'approved' })
        .eq('id', record.id);

      inserted++;
    }

    // Update upload stats
    const currentApproved = (upload.approved_records || 0) + inserted;
    const allApproved = currentApproved >= (upload.total_records || 0);

    await supabase
      .from('aletheia_ingest_uploads')
      .update({
        approved_records: currentApproved,
        status: allApproved ? 'approved' : 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadId);

    return NextResponse.json({ inserted, failed, errors });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'Failed to approve records' }, { status: 500 });
  }
}
