/**
 * Lead Evaluator
 *
 * Evaluates quality and relevance of discovered leads.
 * Assigns quality scores, identifies signals and concerns.
 */

import type { LeadEvaluation, LeadPriority, DiscoveryLead } from './types';

// ============================================
// Quality Signals (positive indicators)
// ============================================

const HIGH_QUALITY_SIGNALS: { pattern: RegExp; signal: string; weight: number }[] = [
  { pattern: /peer[- ]?review/i, signal: 'Peer-reviewed publication', weight: 15 },
  { pattern: /journal of/i, signal: 'Published in academic journal', weight: 10 },
  { pattern: /meta[- ]?analysis/i, signal: 'Meta-analysis', weight: 12 },
  { pattern: /pre[- ]?register/i, signal: 'Pre-registered study', weight: 15 },
  { pattern: /double[- ]?blind/i, signal: 'Double-blind methodology', weight: 12 },
  { pattern: /controlled (study|experiment)/i, signal: 'Controlled study design', weight: 10 },
  { pattern: /n\s*[=:]\s*\d{2,}/i, signal: 'Reports sample size', weight: 8 },
  { pattern: /p\s*[<>=]\s*0?\.\d+/i, signal: 'Reports p-values', weight: 8 },
  { pattern: /effect size/i, signal: 'Reports effect size', weight: 10 },
  { pattern: /replicat/i, signal: 'Replication attempt', weight: 12 },
  { pattern: /quantitative/i, signal: 'Quantitative methodology', weight: 8 },
  { pattern: /university|institut|college/i, signal: 'Institutional affiliation', weight: 8 },
  { pattern: /\.edu\b/i, signal: 'Educational domain', weight: 10 },
  { pattern: /\.gov\b/i, signal: 'Government source', weight: 12 },
  { pattern: /ph\.?d|professor|dr\./i, signal: 'Author has credentials', weight: 8 },
  { pattern: /methodology section/i, signal: 'Methodology documented', weight: 10 },
  { pattern: /raw data|dataset|data available/i, signal: 'Data available', weight: 12 },
  { pattern: /declassified/i, signal: 'Declassified document', weight: 10 },
  { pattern: /foia|freedom of information/i, signal: 'FOIA release', weight: 8 },
  { pattern: /prospective study/i, signal: 'Prospective design', weight: 12 },
  { pattern: /blind(ed)? (judge|rater|assessment)/i, signal: 'Blinded assessment', weight: 10 },
];

// ============================================
// Quality Concerns (negative indicators)
// ============================================

const QUALITY_CONCERNS: { pattern: RegExp; concern: string; weight: number }[] = [
  { pattern: /anonymous/i, concern: 'Anonymous author', weight: -15 },
  { pattern: /they don'?t want you to know/i, concern: 'Conspiratorial framing', weight: -20 },
  { pattern: /cover[- ]?up/i, concern: 'Cover-up narrative', weight: -15 },
  { pattern: /big pharma|big science/i, concern: 'Anti-establishment rhetoric', weight: -15 },
  { pattern: /ancient aliens/i, concern: 'Ancient aliens speculation', weight: -25 },
  { pattern: /no methodology/i, concern: 'No methodology section', weight: -20 },
  { pattern: /blog|forum|reddit/i, concern: 'Informal source', weight: -10 },
  { pattern: /youtube\.com|tiktok/i, concern: 'Social media source', weight: -12 },
  { pattern: /buy now|order today|limited time/i, concern: 'Commercial promotion', weight: -25 },
  { pattern: /unverified|unconfirmed/i, concern: 'Unverified claims', weight: -8 },
  { pattern: /fiction|entertainment/i, concern: 'Entertainment content', weight: -20 },
  { pattern: /creepypasta|nosleep/i, concern: 'Fiction/horror content', weight: -25 },
  { pattern: /rumor|gossip|hearsay/i, concern: 'Rumor-based', weight: -15 },
  { pattern: /no date|undated/i, concern: 'No publication date', weight: -10 },
  { pattern: /self[- ]?published/i, concern: 'Self-published (verify author)', weight: -5 },
  { pattern: /psychic reading|astrology|horoscope/i, concern: 'Non-scientific practice', weight: -20 },
  { pattern: /guaranteed results/i, concern: 'Unscientific claims', weight: -20 },
];

// ============================================
// Domain Detection
// ============================================

const DOMAIN_PATTERNS: { pattern: RegExp; domain: string }[] = [
  { pattern: /nde|near[- ]?death|out[- ]?of[- ]?body|obe/i, domain: 'nde' },
  { pattern: /ufo|uap|unidentified|aerial phenomena|flying saucer/i, domain: 'ufo' },
  { pattern: /bigfoot|sasquatch|cryptid|yeti/i, domain: 'bigfoot' },
  { pattern: /haunting|ghost|paranormal activity|poltergeist/i, domain: 'haunting' },
  { pattern: /remote viewing|rv |stargate|anomalous cognition/i, domain: 'remote_viewing' },
  { pattern: /ganzfeld|psi |esp |telepathy|clairvoyance/i, domain: 'parapsychology' },
  { pattern: /tectonic|earthquake|seismic|geomagnetic/i, domain: 'geophysical' },
  { pattern: /consciousness|hard problem|qualia/i, domain: 'consciousness' },
  { pattern: /reincarnation|past[- ]?life|xenoglossy/i, domain: 'reincarnation' },
  { pattern: /medium(ship)?|channeling|spirit communication/i, domain: 'mediumship' },
  { pattern: /precognition|presentiment|future|premonition/i, domain: 'precognition' },
];

// ============================================
// Evaluation Functions
// ============================================

/**
 * Evaluate a lead's quality
 */
export function evaluateLead(
  title: string,
  description: string,
  url?: string,
  authors?: string[],
  publication?: string
): LeadEvaluation {
  const text = [title, description, url, publication, ...(authors || [])].join(' ');

  let score = 50; // Start at neutral
  const signals: string[] = [];
  const concerns: string[] = [];
  const domains: string[] = [];

  // Check quality signals
  for (const { pattern, signal, weight } of HIGH_QUALITY_SIGNALS) {
    if (pattern.test(text)) {
      score += weight;
      signals.push(signal);
    }
  }

  // Check quality concerns
  for (const { pattern, concern, weight } of QUALITY_CONCERNS) {
    if (pattern.test(text)) {
      score += weight; // weight is negative
      concerns.push(concern);
    }
  }

  // Detect domains
  for (const { pattern, domain } of DOMAIN_PATTERNS) {
    if (pattern.test(text)) {
      domains.push(domain);
    }
  }

  // Author credibility bonus
  if (authors && authors.length > 0) {
    score += 5;
    signals.push(`${authors.length} named author(s)`);
  }

  // Publication bonus
  if (publication) {
    score += 5;
    signals.push(`Published in: ${publication}`);
  }

  // URL domain bonus
  if (url) {
    if (/\.edu\b/i.test(url)) {
      score += 10;
    } else if (/\.gov\b/i.test(url)) {
      score += 12;
    } else if (/scholar\.google|pubmed|jstor|arxiv/i.test(url)) {
      score += 8;
      signals.push('Academic database');
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine priority
  let priority: LeadPriority = 'normal';
  if (score >= 80) {
    priority = 'high';
  } else if (score >= 90) {
    priority = 'urgent';
  } else if (score < 40) {
    priority = 'low';
  }

  // Determine recommendation
  let recommendation: 'approve' | 'reject' | 'investigate' = 'investigate';
  if (score >= 70 && concerns.length === 0) {
    recommendation = 'approve';
  } else if (score < 30 || concerns.length >= 3) {
    recommendation = 'reject';
  }

  return {
    quality_score: score,
    quality_signals: signals,
    quality_concerns: concerns,
    domains,
    priority,
    recommendation,
  };
}

/**
 * Check if content is likely a duplicate of existing leads
 */
export function checkDuplication(
  newTitle: string,
  newUrl: string | undefined,
  existingLeads: DiscoveryLead[]
): { isDuplicate: boolean; similarLead?: DiscoveryLead } {
  // Check URL match
  if (newUrl) {
    const normalizedUrl = normalizeUrl(newUrl);
    for (const lead of existingLeads) {
      if (lead.source_url && normalizeUrl(lead.source_url) === normalizedUrl) {
        return { isDuplicate: true, similarLead: lead };
      }
    }
  }

  // Check title similarity
  const normalizedTitle = normalizeTitle(newTitle);
  for (const lead of existingLeads) {
    const similarity = calculateSimilarity(normalizedTitle, normalizeTitle(lead.title));
    if (similarity > 0.85) {
      return { isDuplicate: true, similarLead: lead };
    }
  }

  return { isDuplicate: false };
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .replace(/[?#].*$/, '');
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Jaccard similarity between two strings
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  const intersection = Array.from(setA).filter(x => setB.has(x));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.length / union.size;
}

/**
 * Extract sample size from text if present
 */
export function extractSampleSize(text: string): number | undefined {
  // Match patterns like "n=47", "N = 123", "sample of 50"
  const patterns = [
    /n\s*[=:]\s*(\d+)/i,
    /sample (?:size )?(?:of )?(\d+)/i,
    /(\d+)\s*participants/i,
    /(\d+)\s*subjects/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n < 1000000) {
        return n;
      }
    }
  }

  return undefined;
}

/**
 * Detect if content has quantitative data
 */
export function hasQuantitativeData(text: string): boolean {
  const indicators = [
    /p\s*[<>=]\s*0?\.\d+/i,       // p-values
    /r\s*[=:]\s*-?0?\.\d+/i,      // correlations
    /t\s*[=:]\s*-?\d+\.?\d*/i,    // t-statistics
    /f\s*[=:]\s*\d+\.?\d*/i,      // F-statistics
    /chi[- ]?square/i,            // chi-square
    /effect size/i,               // effect size
    /confidence interval/i,       // CI
    /standard deviation/i,        // SD
    /mean\s*[=:]/i,              // means
    /anova/i,                     // ANOVA
    /regression/i,                // regression
    /statistical(ly)? significant/i, // significance
  ];

  return indicators.some(pattern => pattern.test(text));
}

/**
 * Detect language from text
 */
export function detectLanguage(text: string): string {
  // Simple heuristic - could be enhanced with proper detection library
  const indicators: { lang: string; patterns: RegExp[] }[] = [
    { lang: 'pt', patterns: [/\bé\b|\bde\b|\bpara\b|\bnão\b/i] },
    { lang: 'de', patterns: [/\bund\b|\bdie\b|\bder\b|\bdas\b/i] },
    { lang: 'ru', patterns: [/[а-яА-Я]+/] },
    { lang: 'ja', patterns: [/[\u3040-\u309F\u30A0-\u30FF]+/] },
    { lang: 'es', patterns: [/\bel\b|\bla\b|\blos\b|\bque\b/i] },
    { lang: 'fr', patterns: [/\ble\b|\bla\b|\bles\b|\bque\b/i] },
  ];

  for (const { lang, patterns } of indicators) {
    if (patterns.some(p => p.test(text))) {
      return lang;
    }
  }

  return 'en';
}
