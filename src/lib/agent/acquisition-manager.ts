/**
 * Acquisition Manager
 *
 * Manages data acquisition requests:
 * - Queue requests for human review
 * - Track approval status
 * - Execute approved acquisitions
 */

import { createAgentReadClient } from './supabase-admin';
import type {
  AcquisitionRequest,
  AcquisitionStatus,
  DataGap,
  DataSource,
  ExtractionResult,
} from './types';

/**
 * Create an acquisition request from a gap and source
 */
export async function createAcquisitionRequest(
  gap: DataGap,
  source: DataSource,
  sessionId?: string
): Promise<string> {
  const supabase = createAgentReadClient();

  const request: Partial<AcquisitionRequest> = {
    session_id: sessionId,
    gap_type: gap.type,
    gap_description: gap.description,
    source_name: source.name,
    source_url: source.url,
    source_type: source.type,
    domain: source.domain,
    estimated_records: source.estimated_records,
    quality_estimate: source.quality_estimate,
    quality_reasoning: source.quality_reasoning,
    access_method: source.access_method,
    extraction_notes: `Discovered to address ${gap.type} gap: ${gap.description}`,
    status: 'pending',
  };

  const { data, error } = await supabase
    .from('aletheia_acquisition_requests')
    .insert(request)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create acquisition request: ${error.message}`);
  }

  return data.id;
}

/**
 * Get pending acquisition requests
 */
export async function getPendingRequests(): Promise<AcquisitionRequest[]> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_acquisition_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending requests: ${error.message}`);
  }

  return data as AcquisitionRequest[];
}

/**
 * Get all acquisition requests with optional filtering
 */
export async function getAcquisitionRequests(options?: {
  status?: AcquisitionStatus;
  domain?: string;
  limit?: number;
}): Promise<AcquisitionRequest[]> {
  const supabase = createAgentReadClient();

  let query = supabase
    .from('aletheia_acquisition_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.domain) {
    query = query.eq('domain', options.domain);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch acquisition requests: ${error.message}`);
  }

  return data as AcquisitionRequest[];
}

/**
 * Get a single acquisition request by ID
 */
export async function getAcquisitionRequest(id: string): Promise<AcquisitionRequest | null> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_acquisition_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch acquisition request: ${error.message}`);
  }

  return data as AcquisitionRequest;
}

/**
 * Approve an acquisition request
 */
export async function approveRequest(
  id: string,
  reviewedBy?: string,
  notes?: string
): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_acquisition_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to approve request: ${error.message}`);
  }
}

/**
 * Reject an acquisition request
 */
export async function rejectRequest(
  id: string,
  reviewedBy?: string,
  notes?: string
): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_acquisition_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`);
  }
}

/**
 * Mark request as in progress
 */
export async function markInProgress(id: string): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_acquisition_requests')
    .update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to mark request in progress: ${error.message}`);
  }
}

/**
 * Mark request as completed
 */
export async function markCompleted(
  id: string,
  result: ExtractionResult
): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_acquisition_requests')
    .update({
      status: 'completed',
      records_acquired: result.records_ingested,
      acquisition_log: JSON.stringify({
        records_found: result.records_found,
        records_valid: result.records_valid,
        records_duplicate: result.records_duplicate,
        records_ingested: result.records_ingested,
        errors: result.errors,
      }),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to mark request completed: ${error.message}`);
  }
}

/**
 * Mark request as failed
 */
export async function markFailed(id: string, errorLog: string): Promise<void> {
  const supabase = createAgentReadClient();

  const { error } = await supabase
    .from('aletheia_acquisition_requests')
    .update({
      status: 'failed',
      acquisition_log: errorLog,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to mark request as failed: ${error.message}`);
  }
}

/**
 * Get acquisition statistics
 */
export async function getAcquisitionStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  completed: number;
  failed: number;
  totalRecordsAcquired: number;
}> {
  const supabase = createAgentReadClient();

  const { data, error } = await supabase
    .from('aletheia_acquisition_requests')
    .select('status, records_acquired');

  if (error) {
    throw new Error(`Failed to fetch acquisition stats: ${error.message}`);
  }

  const stats = {
    total: data.length,
    pending: 0,
    approved: 0,
    completed: 0,
    failed: 0,
    totalRecordsAcquired: 0,
  };

  for (const row of data) {
    switch (row.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'approved':
      case 'in_progress':
        stats.approved++;
        break;
      case 'completed':
        stats.completed++;
        stats.totalRecordsAcquired += row.records_acquired || 0;
        break;
      case 'failed':
      case 'rejected':
        stats.failed++;
        break;
    }
  }

  return stats;
}

/**
 * Check if we should auto-approve a request
 * (for known high-quality sources with small record counts)
 */
export function shouldAutoApprove(request: AcquisitionRequest): boolean {
  // Never auto-approve low quality sources
  if (request.quality_estimate === 'low') {
    return false;
  }

  // Never auto-approve large acquisitions
  if (request.estimated_records && request.estimated_records > 500) {
    return false;
  }

  // Only auto-approve known high-quality sources
  const knownHighQualitySources = [
    'nuforc.org',
    'bfro.net',
    'nderf.org',
    'earthquake.usgs.gov',
  ];

  return knownHighQualitySources.some(url =>
    request.source_url.toLowerCase().includes(url)
  );
}
