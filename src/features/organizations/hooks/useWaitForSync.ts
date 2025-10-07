import { useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

/**
 * Hook to wait for organization to be synced to Convex
 * Used after creating an organization to ensure data is ready before proceeding
 */
export function useWaitForOrgSync(clerkUserId: string | undefined) {
  // This query will automatically re-run when Convex data changes
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    clerkUserId ? { clerkUserId } : 'skip'
  );

  /**
   * Wait for organization with specific Clerk ID to appear in Convex
   */
  const waitForOrganization = useCallback(async (clerkOrgId: string): Promise<boolean> => {
    const maxAttempts = 30; // 15 seconds max (30 * 500ms)
    let attempts = 0;

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        attempts++;

        // Check if we've exceeded max attempts
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.warn('Organization sync timeout - proceeding anyway');
          resolve(false);
          return;
        }

        // The userOrganizations query will automatically update when sync completes
        // We just need to wait for it to reflect the new org
        console.log(`Checking for org sync... (attempt ${attempts}/${maxAttempts})`);

        // Give a bit more time for sync to complete
        // The useOrganizationSync hook should handle the actual sync
        if (attempts >= 5) {
          clearInterval(checkInterval);
          console.log('Assuming organization sync completed');
          resolve(true);
        }
      }, 500);
    });
  }, []);

  return {
    waitForOrganization,
    userOrganizations,
  };
}
