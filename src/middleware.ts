/**
 * Project Aletheia - Middleware
 * Handles session refresh and route protection
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'))
  ) {
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
