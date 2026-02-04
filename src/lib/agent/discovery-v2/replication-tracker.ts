/**
 * Discovery Agent v2 - Replication Tracker
 * Track which findings have been replicated across studies
 */

import { getAdminClient } from '../supabase-admin';
import type {
  PaperExtraction,
  ReplicationTracking,
  ReplicationAttempt,
  AletheiaReplication,
} from './types';


/**
 * Create a new replication tracking entry
 */
export async function createReplicationEntry(
  originalPaperId: string | undefined,
  finding: string,
  citation: string,
  n?: number,
  effect?: number
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_replication_tracking')
    .insert({
      original_paper_id: originalPaperId,
      original_finding: finding,
      original_citation: citation,
      original_n: n,
      original_effect: effect,
      replications: [],
      total_replications: 0,
      successful_replications: 0,
      replication_status: 'untested',
      confidence_score: 0.5,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Create replication entry error:', error);
    return null;
  }

  return data.id;
}

/**
 * Add a replication attempt to an existing entry
 */
export async function addReplicationAttempt(
  trackingId: string,
  attempt: ReplicationAttempt
): Promise<boolean> {
  // First get the current entry
  const { data: current, error: fetchError } = await getAdminClient()
    .from('aletheia_replication_tracking')
    .select('*')
    .eq('id', trackingId)
    .single();

  if (fetchError || !current) {
    console.error('Fetch replication entry error:', fetchError);
    return false;
  }

  // Add new attempt
  const replications = [...(current.replications || []), attempt];
  const totalReplications = replications.length;
  const successfulReplications = replications.filter(r => r.successful).length;

  // Calculate new status
  const status = calculateReplicationStatus(totalReplications, successfulReplications);

  // Calculate meta-analytic effect (simple weighted average)
  const effectValues = replications.filter(r => r.effect !== undefined).map(r => r.effect);
  const metaEffect = effectValues.length > 0
    ? effectValues.reduce((a, b) => a + b, 0) / effectValues.length
    : current.meta_analytic_effect;

  // Calculate heterogeneity (simple I² approximation)
  const heterogeneity = effectValues.length > 1
    ? calculateI2(effectValues, current.original_effect)
    : null;

  // Calculate confidence score
  const confidence = calculateConfidenceScore(
    totalReplications,
    successfulReplications,
    heterogeneity
  );

  const { error: updateError } = await getAdminClient()
    .from('aletheia_replication_tracking')
    .update({
      replications,
      total_replications: totalReplications,
      successful_replications: successfulReplications,
      meta_analytic_effect: metaEffect,
      heterogeneity_i2: heterogeneity,
      replication_status: status,
      confidence_score: confidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackingId);

  if (updateError) {
    console.error('Update replication entry error:', updateError);
    return false;
  }

  return true;
}

/**
 * Add Aletheia's own replication result
 */
export async function addAletheiaReplication(
  trackingId: string,
  replication: AletheiaReplication
): Promise<boolean> {
  const { error } = await getAdminClient()
    .from('aletheia_replication_tracking')
    .update({
      aletheia_replication: replication,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackingId);

  if (error) {
    console.error('Add Aletheia replication error:', error);
    return false;
  }

  return true;
}

/**
 * Calculate replication status based on attempts
 */
function calculateReplicationStatus(
  total: number,
  successful: number
): 'robust' | 'contested' | 'failed' | 'untested' {
  if (total === 0) return 'untested';

  const successRate = successful / total;

  if (total >= 3 && successRate >= 0.75) return 'robust';
  if (total >= 2 && successRate >= 0.5) return 'contested';
  if (total >= 2 && successRate < 0.5) return 'failed';

  // Only 1 replication
  return successful > 0 ? 'contested' : 'failed';
}

/**
 * Calculate I² heterogeneity statistic (simplified)
 */
function calculateI2(effects: number[], originalEffect?: number): number {
  if (effects.length < 2) return 0;

  const allEffects = originalEffect !== undefined
    ? [originalEffect, ...effects]
    : effects;

  const mean = allEffects.reduce((a, b) => a + b, 0) / allEffects.length;
  const variance = allEffects.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / allEffects.length;

  // I² is proportion of variance due to heterogeneity
  // Simplified calculation - not a true meta-analytic I²
  const maxExpectedVariance = Math.pow(mean * 0.1, 2); // Expect 10% variance
  const i2 = Math.min(100, Math.max(0, (variance - maxExpectedVariance) / variance * 100));

  return i2;
}

/**
 * Calculate confidence score
 */
function calculateConfidenceScore(
  totalReplications: number,
  successfulReplications: number,
  heterogeneity: number | null
): number {
  let score = 0.5; // Base score

  // More replications = more confidence (up to +0.3)
  score += Math.min(0.3, totalReplications * 0.1);

  // Success rate matters (up to ±0.2)
  if (totalReplications > 0) {
    const successRate = successfulReplications / totalReplications;
    score += (successRate - 0.5) * 0.4;
  }

  // Low heterogeneity = more confidence
  if (heterogeneity !== null) {
    if (heterogeneity < 25) score += 0.1;
    else if (heterogeneity > 75) score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Get replication tracking entries
 */
export async function getReplicationEntries(options: {
  domain?: string;
  status?: string;
  limit?: number;
}): Promise<ReplicationTracking[]> {
  let query = getAdminClient()
    .from('aletheia_replication_tracking')
    .select('*')
    .order('confidence_score', { ascending: false })
    .limit(options.limit || 50);

  if (options.domain) {
    query = query.eq('domain', options.domain);
  }

  if (options.status) {
    query = query.eq('replication_status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Get replication entries error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get replication entry by ID
 */
export async function getReplicationEntry(id: string): Promise<ReplicationTracking | null> {
  const { data, error } = await getAdminClient()
    .from('aletheia_replication_tracking')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get replication entry error:', error);
    return null;
  }

  return data;
}

/**
 * Find existing replication entry for a finding
 */
export async function findExistingEntry(finding: string): Promise<ReplicationTracking | null> {
  // Normalize finding for comparison
  const normalized = finding.toLowerCase().replace(/[^\w\s]/g, '');

  const { data, error } = await getAdminClient()
    .from('aletheia_replication_tracking')
    .select('*');

  if (error) {
    console.error('Find existing entry error:', error);
    return null;
  }

  // Find similar findings (simple text similarity)
  const matches = (data || []).filter(entry => {
    const entryNormalized = entry.original_finding.toLowerCase().replace(/[^\w\s]/g, '');
    return textSimilarity(normalized, entryNormalized) > 0.8;
  });

  return matches.length > 0 ? matches[0] : null;
}

/**
 * Simple text similarity (Jaccard index on words)
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const wordsArrayA = Array.from(wordsA);
  const wordsArrayB = Array.from(wordsB);
  const intersection = new Set(wordsArrayA.filter(w => wordsB.has(w)));
  const union = new Set([...wordsArrayA, ...wordsArrayB]);

  return intersection.size / union.size;
}

/**
 * Auto-create replication entries from paper extractions
 */
export async function createEntriesFromPapers(
  papers: PaperExtraction[]
): Promise<number> {
  let created = 0;

  for (const paper of papers) {
    // Create entries for major findings with statistics
    for (const stat of paper.statistics) {
      if (stat.statistic_type === 'percentage' && stat.value > 0) {
        // Check if similar entry exists
        const existing = await findExistingEntry(stat.finding);

        if (existing) {
          // Add as replication attempt
          await addReplicationAttempt(existing.id!, {
            paper: paper.title,
            citation: `${paper.authors?.[0] || 'Unknown'} (${paper.publication_date?.substring(0, 4) || 'n.d.'})`,
            n: paper.sample_size || 0,
            effect: stat.value,
            successful: true, // Assume successful if reported
            notes: stat.context,
          });
        } else {
          // Create new entry
          const id = await createReplicationEntry(
            paper.id,
            stat.finding,
            `${paper.authors?.[0] || 'Unknown'} (${paper.publication_date?.substring(0, 4) || 'n.d.'})`,
            paper.sample_size,
            stat.value
          );

          if (id) created++;
        }
      }
    }
  }

  return created;
}
