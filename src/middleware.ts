/**
 * Project Aletheia - Middleware
 * Handles session refresh, route protection, and CSRF validation
 */

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase-middleware';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/submit',
  '/profile',
  '/settings',
  '/review',
  '/admin',
];

// Routes that require specific roles
const REVIEWER_ROUTES = ['/review'];
const ADMIN_ROUTES = ['/admin'];

// Public routes (no auth required)
const PUBLIC_ROUTES = [
  '/',
  '/auth-test',
  '/investigations',
  '/predictions',
  '/patterns',
  '/about',
  '/api/auth/callback',
];

// State-changing HTTP methods that need CSRF protection
const CSRF_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

// Allowed origins for CSRF validation
const ALLOWED_ORIGINS = new Set([
  'https://projectaletheia.org',
  'https://www.projectaletheia.org',
  'http://localhost:3000',
  'http://localhost:3001',
]);

// Build dynamic allowed origins (Vercel sets VERCEL_URL at build time)
if (process.env.VERCEL_URL) {
  ALLOWED_ORIGINS.add(`https://${process.env.VERCEL_URL}`);
}
if (process.env.NEXT_PUBLIC_SITE_URL) {
  ALLOWED_ORIGINS.add(process.env.NEXT_PUBLIC_SITE_URL);
}

/**
 * Validate Origin/Referer header for CSRF protection.
 * Returns null if valid, or a Response if the request should be rejected.
 */
function validateCsrf(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin) {
    // Origin header present — must match allowed list
    if (!ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json(
        { error: 'CSRF validation failed: origin not allowed' },
        { status: 403 }
      );
    }
    return null; // Valid
  }

  if (referer) {
    // No Origin but Referer present — extract and validate origin from Referer
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (!ALLOWED_ORIGINS.has(refererOrigin)) {
        return NextResponse.json(
          { error: 'CSRF validation failed: referer not allowed' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'CSRF validation failed: invalid referer' },
        { status: 403 }
      );
    }
    return null; // Valid
  }

  // Neither Origin nor Referer present.
  // This covers server-to-server calls (cron jobs, Pi agents, edge functions)
  // which don't send Origin headers and don't have browser cookies (SameSite).
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // CSRF protection for state-changing API requests
  if (pathname.startsWith('/api') && CSRF_METHODS.has(request.method)) {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;
  }

  // Skip remaining middleware for API routes (auth check is in each route handler)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Update session (refresh tokens)
  const { supabaseResponse, user } = await updateSession(request);

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const isReviewerRoute = REVIEWER_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth-required', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For reviewer/admin routes, we need to check the user's role
  // This requires a database lookup, so we'll do basic redirect here
  // and let the page component handle detailed permission checks
  if ((isReviewerRoute || isAdminRoute) && !user) {
    const redirectUrl = new URL('/auth-required', request.url);
    redirectUrl.searchParams.set('next', pathname);
    redirectUrl.searchParams.set('reason', 'elevated_access');
    return NextResponse.redirect(redirectUrl);
  }

  // Add user info to request headers for server components
  if (user) {
    supabaseResponse.headers.set('x-user-id', user.id);
    supabaseResponse.headers.set('x-user-email', user.email || '');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
