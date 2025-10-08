import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback',
  '/api/webhooks(.*)',
  '/api/invitations/details',
]);

// Define auth pages that should redirect if user is already signed in
const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// Protect all routes except public ones
export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // If user is signed in and trying to access auth pages, redirect to dashboard
  if (userId && isAuthPage(request)) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
