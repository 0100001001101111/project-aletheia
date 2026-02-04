/**
 * Connection Agent - Witness Clusterer
 * Cluster analysis of experiencers across domains
 */

import { getAdminClient } from '../supabase-admin';
import type { WitnessProfile, ClusterAssignment, ClusterCenter } from './types';


// Standard demographic and experiential features to extract
const CLUSTERING_FEATURES = [
  // Demographics
  { name: 'age', type: 'numeric', normalize: true },
  { name: 'gender', type: 'categorical', categories: ['male', 'female', 'other'] },

  // Experience characteristics
  { name: 'duration_minutes', type: 'numeric', normalize: true },
  { name: 'multiple_witnesses', type: 'boolean' },
  { name: 'physical_effects', type: 'boolean' },
  { name: 'repeat_experience', type: 'boolean' },

  // Psychological
  { name: 'prior_belief', type: 'categorical', categories: ['believer', 'skeptic', 'neutral'] },
  { name: 'emotional_impact', type: 'categorical', categories: ['positive', 'negative', 'neutral', 'mixed'] },

  // Context
  { name: 'time_of_day', type: 'categorical', categories: ['morning', 'afternoon', 'evening', 'night'] },
  { name: 'rural_urban', type: 'categorical', categories: ['rural', 'suburban', 'urban'] },
];

interface FeatureVector {
  investigation_id: string;
  domain: string;
  features: Record<string, number>;
}

/**
 * Extract feature vector from a record
 */
function extractFeatures(
  investigationId: string,
  domain: string,
  rawData: Record<string, unknown>
): FeatureVector | null {
  const features: Record<string, number> = {};
  let validFeatures = 0;

  for (const feature of CLUSTERING_FEATURES) {
    const value = extractValue(rawData, feature.name);

    if (value === null || value === undefined) {
      features[feature.name] = 0; // Missing value
      continue;
    }

    if (feature.type === 'numeric') {
      const numVal = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(numVal)) {
        features[feature.name] = numVal;
        validFeatures++;
      } else {
        features[feature.name] = 0;
      }
    } else if (feature.type === 'boolean') {
      const boolVal = value === true || value === 'yes' || value === 'Yes' || value === 1;
      features[feature.name] = boolVal ? 1 : 0;
      validFeatures++;
    } else if (feature.type === 'categorical' && feature.categories) {
      // One-hot encode
      const strVal = String(value).toLowerCase();
      for (let i = 0; i < feature.categories.length; i++) {
        const catName = `${feature.name}_${feature.categories[i]}`;
        features[catName] = feature.categories[i].toLowerCase() === strVal ? 1 : 0;
      }
      if (feature.categories.some(c => c.toLowerCase() === strVal)) {
        validFeatures++;
      }
    }
  }

  if (validFeatures < 2) {
    return null; // Not enough valid features
  }

  return { investigation_id: investigationId, domain, features };
}

/**
 * Helper to extract value from nested object
 */
function extractValue(data: Record<string, unknown>, key: string): unknown {
  // Direct access
  if (key in data) return data[key];

  // Try common variations
  const variations = [
    key,
    key.toLowerCase(),
    key.toUpperCase(),
    key.replace(/_/g, ''),
    `witness_${key}`,
    `experiencer_${key}`,
  ];

  for (const variant of variations) {
    if (variant in data) return data[variant];
  }

  // Check nested objects
  for (const k of Object.keys(data)) {
    if (typeof data[k] === 'object' && data[k] !== null) {
      const nested = data[k] as Record<string, unknown>;
      for (const variant of variations) {
        if (variant in nested) return nested[variant];
      }
    }
  }

  return null;
}

/**
 * Calculate Euclidean distance between two feature vectors
 */
function euclideanDistance(a: Record<string, number>, b: Record<string, number>): number {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  let sumSq = 0;

  for (const key of keys) {
    const diff = (a[key] || 0) - (b[key] || 0);
    sumSq += diff * diff;
  }

  return Math.sqrt(sumSq);
}

/**
 * Simple K-means clustering implementation
 */
function kMeans(
  vectors: FeatureVector[],
  k: number,
  maxIterations: number = 100
): { centers: ClusterCenter[]; assignments: Map<string, number> } {
  if (vectors.length < k) {
    k = Math.max(2, Math.floor(vectors.length / 2));
  }

  // Get all feature keys
  const allKeys = new Set<string>();
  vectors.forEach(v => Object.keys(v.features).forEach(k => allKeys.add(k)));
  const featureKeys = Array.from(allKeys);

  // Initialize centers randomly
  const shuffled = [...vectors].sort(() => Math.random() - 0.5);
  let centers = shuffled.slice(0, k).map(v => ({ ...v.features }));

  const assignments = new Map<string, number>();
  let changed = true;
  let iterations = 0;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Assign each vector to nearest center
    for (const vector of vectors) {
      let minDist = Infinity;
      let nearestCluster = 0;

      for (let c = 0; c < centers.length; c++) {
        const dist = euclideanDistance(vector.features, centers[c]);
        if (dist < minDist) {
          minDist = dist;
          nearestCluster = c;
        }
      }

      const prevAssignment = assignments.get(vector.investigation_id);
      if (prevAssignment !== nearestCluster) {
        changed = true;
        assignments.set(vector.investigation_id, nearestCluster);
      }
    }

    // Update centers
    const newCenters: Record<string, number>[] = [];
    for (let c = 0; c < k; c++) {
      const clusterVectors = vectors.filter(
        v => assignments.get(v.investigation_id) === c
      );

      if (clusterVectors.length === 0) {
        newCenters.push(centers[c]); // Keep old center if cluster is empty
        continue;
      }

      const newCenter: Record<string, number> = {};
      for (const key of featureKeys) {
        const sum = clusterVectors.reduce((s, v) => s + (v.features[key] || 0), 0);
        newCenter[key] = sum / clusterVectors.length;
      }
      newCenters.push(newCenter);
    }
    centers = newCenters;
  }

  // Convert centers to ClusterCenter type
  const clusterCenters: ClusterCenter[] = centers.map(c => {
    const center: ClusterCenter = {};
    for (const [key, value] of Object.entries(c)) {
      center[key] = value;
    }
    return center;
  });

  return { centers: clusterCenters, assignments };
}

/**
 * Calculate silhouette score for clustering quality
 */
function calculateSilhouetteScore(
  vectors: FeatureVector[],
  assignments: Map<string, number>,
  k: number
): number {
  if (vectors.length < 3 || k < 2) return 0;

  let totalSilhouette = 0;
  let count = 0;

  for (const vector of vectors) {
    const cluster = assignments.get(vector.investigation_id);
    if (cluster === undefined) continue;

    // Calculate a(i) - average distance to same cluster
    const sameCluster = vectors.filter(
      v => assignments.get(v.investigation_id) === cluster && v.investigation_id !== vector.investigation_id
    );

    if (sameCluster.length === 0) continue;

    const a = sameCluster.reduce(
      (sum, v) => sum + euclideanDistance(vector.features, v.features),
      0
    ) / sameCluster.length;

    // Calculate b(i) - minimum average distance to other clusters
    let minB = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === cluster) continue;

      const otherCluster = vectors.filter(
        v => assignments.get(v.investigation_id) === c
      );

      if (otherCluster.length === 0) continue;

      const avgDist = otherCluster.reduce(
        (sum, v) => sum + euclideanDistance(vector.features, v.features),
        0
      ) / otherCluster.length;

      minB = Math.min(minB, avgDist);
    }

    if (minB === Infinity) continue;

    const silhouette = (minB - a) / Math.max(a, minB);
    totalSilhouette += silhouette;
    count++;
  }

  return count > 0 ? totalSilhouette / count : 0;
}

/**
 * Run witness profile clustering across domains
 */
export async function clusterWitnesses(
  domains: string[],
  nClusters: number = 4,
  profileName: string = 'Cross-Domain Witness Profiles'
): Promise<{ profile: WitnessProfile; assignments: ClusterAssignment[] } | null> {
  // Fetch records from all domains
  const allVectors: FeatureVector[] = [];

  for (const domain of domains) {
    const { data, error } = await getAdminClient()
      .from('aletheia_investigations')
      .select('id, investigation_type, raw_data')
      .eq('investigation_type', domain)
      .not('raw_data', 'is', null)
      .limit(2000);

    if (error) {
      console.error(`Witness clustering fetch error for ${domain}:`, error);
      continue;
    }

    if (!data) continue;

    for (const record of data) {
      const vector = extractFeatures(
        record.id,
        record.investigation_type,
        record.raw_data as Record<string, unknown>
      );
      if (vector) {
        allVectors.push(vector);
      }
    }
  }

  if (allVectors.length < nClusters * 3) {
    console.log(`Not enough data for clustering: ${allVectors.length} vectors`);
    return null;
  }

  // Normalize numeric features
  const numericFeatures = CLUSTERING_FEATURES
    .filter(f => f.type === 'numeric' && f.normalize)
    .map(f => f.name);

  for (const featureName of numericFeatures) {
    const values = allVectors
      .map(v => v.features[featureName])
      .filter(v => v !== undefined);

    if (values.length === 0) continue;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    for (const vector of allVectors) {
      if (vector.features[featureName] !== undefined) {
        vector.features[featureName] = (vector.features[featureName] - min) / range;
      }
    }
  }

  // Run K-means
  const { centers, assignments } = kMeans(allVectors, nClusters);

  // Calculate cluster sizes
  const clusterSizes: number[] = [];
  for (let c = 0; c < nClusters; c++) {
    clusterSizes.push(
      Array.from(assignments.values()).filter(a => a === c).length
    );
  }

  // Calculate domain distribution
  const domainDistribution: Record<string, Record<number, number>> = {};
  for (const domain of domains) {
    domainDistribution[domain] = {};
    for (let c = 0; c < nClusters; c++) {
      domainDistribution[domain][c] = 0;
    }
  }

  for (const vector of allVectors) {
    const cluster = assignments.get(vector.investigation_id);
    if (cluster !== undefined && domainDistribution[vector.domain]) {
      domainDistribution[vector.domain][cluster]++;
    }
  }

  // Calculate silhouette score
  const silhouetteScore = calculateSilhouetteScore(allVectors, assignments, nClusters);

  // Calculate inertia (within-cluster sum of squares)
  let inertia = 0;
  for (const vector of allVectors) {
    const cluster = assignments.get(vector.investigation_id);
    if (cluster !== undefined && centers[cluster]) {
      const dist = euclideanDistance(vector.features, centers[cluster] as Record<string, number>);
      inertia += dist * dist;
    }
  }

  // Create profile
  const profile: WitnessProfile = {
    profile_name: profileName,
    profile_description: `K-means clustering of ${allVectors.length} witnesses across ${domains.length} domains into ${nClusters} clusters`,
    clustering_method: 'k-means',
    features_used: CLUSTERING_FEATURES.map(f => f.name),
    n_clusters: nClusters,
    cluster_centers: centers,
    cluster_sizes: clusterSizes,
    domain_distribution: domainDistribution,
    silhouette_score: silhouetteScore,
    inertia,
  };

  // Create assignments
  const clusterAssignments: ClusterAssignment[] = [];
  for (const vector of allVectors) {
    const cluster = assignments.get(vector.investigation_id);
    if (cluster !== undefined && centers[cluster]) {
      const distance = euclideanDistance(vector.features, centers[cluster] as Record<string, number>);
      clusterAssignments.push({
        profile_id: '', // Will be set after saving profile
        investigation_id: vector.investigation_id,
        cluster_id: cluster,
        cluster_label: generateClusterLabel(centers[cluster] as Record<string, number>),
        distance_to_center: distance,
      });
    }
  }

  return { profile, assignments: clusterAssignments };
}

/**
 * Generate a human-readable cluster label from center features
 */
function generateClusterLabel(center: Record<string, number>): string {
  const labels: string[] = [];

  // Check age range
  if (center.age !== undefined) {
    if (center.age < 0.3) labels.push('Young');
    else if (center.age > 0.7) labels.push('Older');
  }

  // Check gender
  if (center.gender_male > 0.6) labels.push('Male');
  else if (center.gender_female > 0.6) labels.push('Female');

  // Check experience type
  if (center.multiple_witnesses > 0.5) labels.push('Group');
  if (center.physical_effects > 0.5) labels.push('Physical');
  if (center.repeat_experience > 0.5) labels.push('Repeat');

  // Check emotional impact
  if (center.emotional_impact_positive > 0.5) labels.push('Positive');
  else if (center.emotional_impact_negative > 0.5) labels.push('Negative');

  // Check setting
  if (center.time_of_day_night > 0.5) labels.push('Night');
  if (center.rural_urban_rural > 0.5) labels.push('Rural');
  else if (center.rural_urban_urban > 0.5) labels.push('Urban');

  return labels.length > 0 ? labels.join(' ') : 'Mixed Profile';
}

/**
 * Save witness profile and assignments
 */
export async function saveWitnessProfile(
  profile: WitnessProfile,
  assignments: ClusterAssignment[],
  sessionId?: string
): Promise<string | null> {
  // Save profile
  const { data: profileData, error: profileError } = await getAdminClient()
    .from('aletheia_witness_profiles')
    .insert({
      session_id: sessionId,
      profile_name: profile.profile_name,
      profile_description: profile.profile_description,
      clustering_method: profile.clustering_method,
      features_used: profile.features_used,
      n_clusters: profile.n_clusters,
      cluster_centers: profile.cluster_centers,
      cluster_sizes: profile.cluster_sizes,
      domain_distribution: profile.domain_distribution,
      silhouette_score: profile.silhouette_score,
      inertia: profile.inertia,
    })
    .select('id')
    .single();

  if (profileError || !profileData) {
    console.error('Save witness profile error:', profileError);
    return null;
  }

  const profileId = profileData.id;

  // Save assignments (in batches)
  const assignmentsWithProfileId = assignments.map(a => ({
    profile_id: profileId,
    investigation_id: a.investigation_id,
    cluster_id: a.cluster_id,
    cluster_label: a.cluster_label,
    distance_to_center: a.distance_to_center,
    membership_probability: a.membership_probability,
  }));

  // Insert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < assignmentsWithProfileId.length; i += batchSize) {
    const batch = assignmentsWithProfileId.slice(i, i + batchSize);
    const { error: assignError } = await getAdminClient()
      .from('aletheia_witness_cluster_assignments')
      .insert(batch);

    if (assignError) {
      console.error('Save cluster assignments error:', assignError);
    }
  }

  return profileId;
}

/**
 * Get witness profiles
 */
export async function getWitnessProfiles(options: {
  sessionId?: string;
  limit?: number;
}): Promise<WitnessProfile[]> {
  let query = getAdminClient()
    .from('aletheia_witness_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.sessionId) {
    query = query.eq('session_id', options.sessionId);
  }

  const { data, error } = await query.limit(options.limit || 20);

  if (error) {
    console.error('Get witness profiles error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get clustering features
 */
export function getClusteringFeatures() {
  return CLUSTERING_FEATURES;
}
