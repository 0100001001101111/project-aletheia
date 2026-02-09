/**
 * Ingest Upload + Parse API
 * Accepts a file + schemaType, extracts text, calls Claude for multi-record parsing
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase-server';
import { extractText } from '@/lib/ingest/extract-text';
import { getFieldDescriptions, SCHEMA_METADATA } from '@/schemas';
import { checkRateLimit, getClientId, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import type { ResearchInvestigationType } from '@/types/database';

const anthropic = new Anthropic();

const VALID_TYPES: ResearchInvestigationType[] = [
  'nde', 'ganzfeld', 'crisis_apparition', 'stargate', 'geophysical', 'ufo',
];

const VALID_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'application/json',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`ingest:${clientId}`, RATE_LIMITS.AI_GENERATION);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const schemaType = formData.get('schemaType') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!schemaType || !VALID_TYPES.includes(schemaType as ResearchInvestigationType)) {
      return NextResponse.json(
        { error: `Invalid schema type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (!VALID_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    // Create upload row (status = parsing)
    const { data: upload, error: uploadErr } = await supabase
      .from('aletheia_ingest_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        schema_type: schemaType,
        status: 'parsing',
      })
      .select('id')
      .single();

    if (uploadErr || !upload) {
      console.error('Failed to create upload row:', uploadErr);
      return NextResponse.json({ error: 'Failed to create upload' }, { status: 500 });
    }

    // Extract text from file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let text: string;

    try {
      text = await extractText(buffer, file.type);
    } catch (err) {
      await supabase
        .from('aletheia_ingest_uploads')
        .update({ status: 'failed', error_message: `Text extraction failed: ${err}` })
        .eq('id', upload.id);
      return NextResponse.json({ error: 'Failed to extract text from file' }, { status: 400 });
    }

    if (!text.trim()) {
      await supabase
        .from('aletheia_ingest_uploads')
        .update({ status: 'failed', error_message: 'File contains no extractable text' })
        .eq('id', upload.id);
      return NextResponse.json({ error: 'File contains no extractable text' }, { status: 400 });
    }

    // Truncate if excessively long (keep first ~100k chars)
    const truncatedText = text.length > 100000
      ? text.slice(0, 100000) + '\n... [truncated]'
      : text;

    // Build multi-record parse prompt
    const prompt = buildIngestPrompt(schemaType as ResearchInvestigationType, truncatedText);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse response
    const records = parseMultiRecordResponse(responseText);

    if (records.length === 0) {
      await supabase
        .from('aletheia_ingest_uploads')
        .update({ status: 'failed', error_message: 'No records could be parsed from file' })
        .eq('id', upload.id);
      return NextResponse.json({ error: 'No records could be parsed' }, { status: 400 });
    }

    // Insert parsed records
    const recordRows = records.map((rec, idx) => ({
      upload_id: upload.id,
      record_index: idx,
      title: rec.title || `Record ${idx + 1}`,
      parsed_data: rec.data,
      confidence: rec.confidence,
      validation_errors: rec.validation_errors || [],
      status: 'pending',
    }));

    const { error: recordErr } = await supabase
      .from('aletheia_ingest_records')
      .insert(recordRows);

    if (recordErr) {
      console.error('Failed to insert records:', recordErr);
      await supabase
        .from('aletheia_ingest_uploads')
        .update({ status: 'failed', error_message: 'Failed to save parsed records' })
        .eq('id', upload.id);
      return NextResponse.json({ error: 'Failed to save parsed records' }, { status: 500 });
    }

    // Update upload status
    await supabase
      .from('aletheia_ingest_uploads')
      .update({
        status: 'ready',
        total_records: records.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', upload.id);

    return NextResponse.json({
      uploadId: upload.id,
      recordCount: records.length,
    });
  } catch (error) {
    console.error('Ingest upload error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}

interface ParsedRecord {
  title?: string;
  data: Record<string, unknown>;
  confidence: Record<string, number>;
  validation_errors?: string[];
}

function buildIngestPrompt(schemaType: ResearchInvestigationType, text: string): string {
  const metadata = SCHEMA_METADATA[schemaType];
  const fieldDescriptions = getFieldDescriptions(schemaType);

  const fieldList = fieldDescriptions
    ? Object.entries(fieldDescriptions)
        .map(([field, desc]) => `- ${field}: ${desc}`)
        .join('\n')
    : '';

  return `You are parsing a research document into structured data for the ${metadata.name} schema.
The document may contain MULTIPLE records/cases. Extract each one separately.

## Task
For each distinct record/case in the text, extract the following fields.
If a field is not mentioned or cannot be determined, use null.
For each field, provide a confidence score (0.0-1.0).

## Schema Fields
${fieldList}

## Important Guidelines
1. Only extract information explicitly stated or clearly implied
2. Do not assume or infer information not present
3. Use exact values when possible
4. For dates, use ISO format (YYYY-MM-DD)
5. For enums, use the exact enum value from the field description
6. Each row in a CSV/table is likely a separate record
7. Give each record a short descriptive title

## Document Text
${text}

## Response Format
Respond with valid JSON only, no other text:
{
  "records": [
    {
      "title": "Short descriptive title for this record",
      "data": {
        "field.name": "value"
      },
      "confidence": {
        "field.name": 0.95
      },
      "validation_errors": ["any issues noted"]
    }
  ]
}`;
}

function parseMultiRecordResponse(response: string): ParsedRecord[] {
  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());
    const rawRecords = parsed.records || parsed;

    if (!Array.isArray(rawRecords)) {
      return [{ data: parsed.data || parsed, confidence: parsed.confidence || {}, title: parsed.title }];
    }

    return rawRecords.map((rec: ParsedRecord) => ({
      title: rec.title,
      data: expandDotNotation(rec.data || {}),
      confidence: rec.confidence || {},
      validation_errors: rec.validation_errors,
    }));
  } catch (error) {
    console.error('Failed to parse multi-record response:', error);
    return [];
  }
}

function expandDotNotation(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}
