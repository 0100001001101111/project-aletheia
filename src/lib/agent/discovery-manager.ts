/**
 * Discovery Manager
 *
 * CRUD operations for Discovery Agent entities.
 */

import { createAgentReadClient } from './supabase-admin';

// Helper to get admin client (uses anon key with RLS)
function getSupabaseAdmin() {
  return createAgentReadClient();
}
import type {
  DiscoverySession,
  DiscoveryLead,
  DiscoverySource,
  TrackedResearcher,
  AgentHandoff,
  LeadStatus,
  LeadPriority,
  DiscoveryStatus,
} from './types';

// ============================================
// Sessions
// ============================================

export async function createDiscoverySession(
  triggerType: string,
  focusAreas?: string[]
): Promise<DiscoverySession> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_discovery_sessions')
    .insert({
      trigger_type: triggerType,
      focus_areas: focusAreas || [],
      status: 'running',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create discovery session: ${error.message}`);
  return data as DiscoverySession;
}

export async function completeDiscoverySession(
  sessionId: string,
  stats: { leads_found: number; connections_found: number; sources_scanned: number },
  summary?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('aletheia_discovery_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      leads_found: stats.leads_found,
      connections_found: stats.connections_found,
      sources_scanned: stats.sources_scanned,
      summary,
    })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to complete session: ${error.message}`);
}

export async function failDiscoverySession(sessionId: string, error: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('aletheia_discovery_sessions')
    .update({
      status: 'failed',
      ended_at: new Date().toISOString(),
      summary: `Error: ${error}`,
    })
    .eq('id', sessionId);
}

export async function getDiscoverySessions(limit = 20): Promise<DiscoverySession[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_discovery_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
  return (data || []) as DiscoverySession[];
}

export async function getCurrentDiscoverySession(): Promise<DiscoverySession | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_discovery_sessions')
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch current session: ${error.message}`);
  }
  return data as DiscoverySession | null;
}

// ============================================
// Leads
// ============================================

export async function createDiscoveryLead(lead: Omit<DiscoveryLead, 'id' | 'created_at'>): Promise<DiscoveryLead> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_discovery_leads')
    .insert(lead)
    .select()
    .single();

  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return data as DiscoveryLead;
}

export async function getDiscoveryLeads(options: {
  status?: LeadStatus;
  lead_type?: string;
  priority?: LeadPriority;
  limit?: number;
}): Promise<DiscoveryLead[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('aletheia_discovery_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit || 50);

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.lead_type) {
    query = query.eq('lead_type', options.lead_type);
  }
  if (options.priority) {
    query = query.eq('priority', options.priority);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`);
  return (data || []) as DiscoveryLead[];
}

export async function getDiscoveryLead(id: string): Promise<DiscoveryLead | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_discovery_leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch lead: ${error.message}`);
  }
  return data as DiscoveryLead | null;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  reviewNotes?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('aletheia_discovery_leads')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq('id', id);

  if (error) throw new Error(`Failed to update lead: ${error.message}`);
}

export async function linkLeadToAcquisition(leadId: string, acquisitionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('aletheia_discovery_leads')
    .update({
      acquisition_request_id: acquisitionId,
      status: 'acquired',
    })
    .eq('id', leadId);

  if (error) throw new Error(`Failed to link lead to acquisition: ${error.message}`);
}

export async function getLeadStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  investigating: number;
  acquired: number;
}> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_discovery_leads')
    .select('status');

  if (error) throw new Error(`Failed to fetch lead stats: ${error.message}`);

  const stats = {
    total: data?.length || 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    investigating: 0,
    acquired: 0,
  };

  for (const lead of data || []) {
    const status = lead.status as LeadStatus;
    if (status in stats) {
      stats[status as keyof typeof stats]++;
    }
  }

  return stats;
}

// ============================================
// Sources
// ============================================

export async function getDiscoverySources(options?: {
  active?: boolean;
  source_type?: string;
}): Promise<DiscoverySource[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('aletheia_discovery_sources')
    .select('*')
    .order('name');

  if (options?.active !== undefined) {
    query = query.eq('active', options.active);
  }
  if (options?.source_type) {
    query = query.eq('source_type', options.source_type);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch sources: ${error.message}`);
  return (data || []) as DiscoverySource[];
}

export async function getSourcesDueForCheck(): Promise<DiscoverySource[]> {
  const supabase = getSupabaseAdmin();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('aletheia_discovery_sources')
    .select('*')
    .eq('active', true)
    .or(`next_check.is.null,next_check.lte.${now}`)
    .order('last_checked', { ascending: true, nullsFirst: true });

  if (error) throw new Error(`Failed to fetch sources due for check: ${error.message}`);
  return (data || []) as DiscoverySource[];
}

export async function updateSourceChecked(
  sourceId: string,
  leadsFound: number
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get source to calculate next check
  const { data: source } = await supabase
    .from('aletheia_discovery_sources')
    .select('monitor_frequency, leads_found')
    .eq('id', sourceId)
    .single();

  const frequencyHours: Record<string, number> = {
    daily: 24,
    weekly: 168,
    monthly: 720,
    manual: 8760, // 1 year
  };

  const hours = frequencyHours[source?.monitor_frequency || 'weekly'] || 168;
  const nextCheck = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('aletheia_discovery_sources')
    .update({
      last_checked: new Date().toISOString(),
      next_check: nextCheck,
      leads_found: (source?.leads_found || 0) + leadsFound,
    })
    .eq('id', sourceId);

  if (error) throw new Error(`Failed to update source: ${error.message}`);
}

export async function createDiscoverySource(source: Omit<DiscoverySource, 'id' | 'created_at'>): Promise<DiscoverySource> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_discovery_sources')
    .insert(source)
    .select()
    .single();

  if (error) throw new Error(`Failed to create source: ${error.message}`);
  return data as DiscoverySource;
}

export async function seedDiscoverySources(sources: Partial<DiscoverySource>[]): Promise<number> {
  const supabase = getSupabaseAdmin();

  // Check existing
  const { data: existing } = await supabase
    .from('aletheia_discovery_sources')
    .select('name');

  const existingNames = new Set((existing || []).map((s: { name: string }) => s.name));
  const newSources = sources.filter(s => !existingNames.has(s.name!));

  if (newSources.length === 0) return 0;

  const { error } = await supabase
    .from('aletheia_discovery_sources')
    .insert(newSources);

  if (error) throw new Error(`Failed to seed sources: ${error.message}`);
  return newSources.length;
}

// ============================================
// Researchers
// ============================================

export async function getTrackedResearchers(options?: {
  active?: boolean;
  domain?: string;
}): Promise<TrackedResearcher[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('aletheia_researchers_tracked')
    .select('*')
    .order('name');

  if (options?.active !== undefined) {
    query = query.eq('active', options.active);
  }
  if (options?.domain) {
    query = query.contains('domains', [options.domain]);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch researchers: ${error.message}`);
  return (data || []) as TrackedResearcher[];
}

export async function updateResearcherChecked(
  researcherId: string,
  publications?: { title: string; url?: string; date?: string }[]
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const update: Record<string, unknown> = {
    last_publication_check: new Date().toISOString(),
  };

  if (publications) {
    update.known_publications = publications;
  }

  const { error } = await supabase
    .from('aletheia_researchers_tracked')
    .update(update)
    .eq('id', researcherId);

  if (error) throw new Error(`Failed to update researcher: ${error.message}`);
}

export async function createTrackedResearcher(researcher: Omit<TrackedResearcher, 'id' | 'created_at'>): Promise<TrackedResearcher> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_researchers_tracked')
    .insert(researcher)
    .select()
    .single();

  if (error) throw new Error(`Failed to create researcher: ${error.message}`);
  return data as TrackedResearcher;
}

export async function seedTrackedResearchers(researchers: Partial<TrackedResearcher>[]): Promise<number> {
  const supabase = getSupabaseAdmin();

  // Check existing
  const { data: existing } = await supabase
    .from('aletheia_researchers_tracked')
    .select('name');

  const existingNames = new Set((existing || []).map((r: { name: string }) => r.name));
  const newResearchers = researchers.filter(r => !existingNames.has(r.name!));

  if (newResearchers.length === 0) return 0;

  const { error } = await supabase
    .from('aletheia_researchers_tracked')
    .insert(newResearchers);

  if (error) throw new Error(`Failed to seed researchers: ${error.message}`);
  return newResearchers.length;
}

// ============================================
// Handoffs
// ============================================

export async function createHandoff(handoff: Omit<AgentHandoff, 'id' | 'created_at'>): Promise<AgentHandoff> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_agent_handoffs')
    .insert(handoff)
    .select()
    .single();

  if (error) throw new Error(`Failed to create handoff: ${error.message}`);
  return data as AgentHandoff;
}

export async function getPendingHandoffs(toAgent: 'discovery' | 'research'): Promise<AgentHandoff[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('aletheia_agent_handoffs')
    .select('*')
    .eq('to_agent', toAgent)
    .eq('status', 'pending')
    .order('created_at');

  if (error) throw new Error(`Failed to fetch handoffs: ${error.message}`);
  return (data || []) as AgentHandoff[];
}

export async function pickUpHandoff(handoffId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('aletheia_agent_handoffs')
    .update({
      status: 'picked_up',
      picked_up_at: new Date().toISOString(),
    })
    .eq('id', handoffId);

  if (error) throw new Error(`Failed to pick up handoff: ${error.message}`);
}

export async function completeHandoff(handoffId: string, result?: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('aletheia_agent_handoffs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result,
    })
    .eq('id', handoffId);

  if (error) throw new Error(`Failed to complete handoff: ${error.message}`);
}

// ============================================
// Status
// ============================================

export async function getDiscoveryStatus(): Promise<DiscoveryStatus> {
  const supabase = getSupabaseAdmin();

  // Check if enabled (use same config as research agent for now)
  const { data: config } = await supabase
    .from('aletheia_agent_config')
    .select('value')
    .eq('key', 'discovery_enabled')
    .single();

  const enabled = config?.value === true || config?.value === 'true';

  // Get current session
  const currentSession = await getCurrentDiscoverySession();

  // Get last completed session
  const { data: lastSession } = await supabase
    .from('aletheia_discovery_sessions')
    .select('*')
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(1)
    .single();

  // Get stats
  const { count: totalSessions } = await supabase
    .from('aletheia_discovery_sessions')
    .select('*', { count: 'exact', head: true });

  const leadStats = await getLeadStats();

  const { count: totalConnections } = await supabase
    .from('aletheia_discovery_leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_type', 'connection');

  const { count: sourcesMonitored } = await supabase
    .from('aletheia_discovery_sources')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  const { count: researchersTracked } = await supabase
    .from('aletheia_researchers_tracked')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  return {
    enabled,
    currentSession,
    lastSession: lastSession as DiscoverySession | null,
    stats: {
      totalSessions: totalSessions || 0,
      totalLeads: leadStats.total,
      pendingLeads: leadStats.pending,
      approvedLeads: leadStats.approved,
      totalConnections: totalConnections || 0,
      sourcesMonitored: sourcesMonitored || 0,
      researchersTracked: researchersTracked || 0,
    },
  };
}
