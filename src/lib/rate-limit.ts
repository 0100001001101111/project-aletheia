/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API routes
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits
// Note: This resets on server restart. For production, use Redis or similar.
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // If no entry or window has expired, create a new entry
  if (!entry || now >= entry.resetTime) {
    const resetTime = now + options.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: options.limit - 1, resetTime };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > options.limit) {
    return { success: false, remaining: 0, resetTime: entry.resetTime };
  }

  return { success: true, remaining: options.limit - entry.count, resetTime: entry.resetTime };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header if behind proxy, otherwise falls back to a default
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - in production, you'd want a more reliable method
  return 'unknown-client';
}

// Preset rate limit configurations
export const RATE_LIMITS = {
  /** General API: 100 requests per minute */
  API: { limit: 100, windowMs: 60 * 1000 },
  /** Submission routes: 10 per minute */
  SUBMISSION: { limit: 10, windowMs: 60 * 1000 },
  /** AI generation routes: 5 per minute */
  AI_GENERATION: { limit: 5, windowMs: 60 * 1000 },
  /** Auth routes: 10 per minute */
  AUTH: { limit: 10, windowMs: 60 * 1000 },
  /** Score calculation: 20 per minute (prevents gaming) */
  SCORE: { limit: 20, windowMs: 60 * 1000 },
} as const;

/**
 * Helper to create rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetTime),
      },
    }
  );
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((entry, key) => {
      if (now >= entry.resetTime) {
        rateLimitStore.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}
