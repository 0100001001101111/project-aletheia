/**
 * Ingest Records API
 * GET: fetch records for an upload
 * PATCH: update a single record (status, edited_data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function GET(request: NextRequest) {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uploadId = request.nextUrl.searchParams.get('upload_id');
  if (!uploadId) {
    return NextResponse.json({ error: 'upload_id is required' }, { status: 400 });
  }

  // Fetch upload metadata (RLS enforces ownership)
  const { data: upload, error: uploadErr } = await supabase
    .from('aletheia_ingest_uploads')
    .select('*')
    .eq('id', uploadId)
    .single();

  if (uploadErr || !upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  // Fetch records (RLS enforces ownership via upload)
  const { data: records, error: recordErr } = await supabase
    .from('aletheia_ingest_records')
    .select('*')
    .eq('upload_id', uploadId)
    .order('record_index', { ascending: true });

  if (recordErr) {
    console.error('Failed to fetch records:', recordErr);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }

  return NextResponse.json({ upload, records: records || [] });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recordId, editedData, status } = body as {
      recordId: string;
      editedData?: Record<string, unknown>;
      status?: string;
    };

    if (!recordId) {
      return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (editedData !== undefined) updates.edited_data = editedData;
    if (status) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // RLS ensures user can only update records they own
    const { data: record, error } = await supabase
      .from('aletheia_ingest_records')
      .update(updates)
      .eq('id', recordId)
      .select('*')
      .single();

    if (error || !record) {
      console.error('Failed to update record:', error);
      return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Records PATCH error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
