'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSmartRedirect } from '@/features/auth/hooks/useRouteProtection';

/**
 * Post-login redirect page
 *
 * This page automatically redirects users to the appropriate location
 * based on their role and restaurant access:
 * - Admins → /dashboard (All view)
 * - Members with access → /dashboard/{first-restaurant-id}
 * - Members without access → /dashboard (shows no-access modal)
 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  const { redirectPath } = useSmartRedirect();

  useEffect(() => {
    if (redirectPath) {
      router.replace(redirectPath);
    }
  }, [redirectPath, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
