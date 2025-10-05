import { ConvexHttpClient } from 'convex/browser';

/**
 * Server-side Convex client for API routes
 */
export function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  }

  return new ConvexHttpClient(convexUrl);
}
