import { useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useOrganization } from '@clerk/nextjs';

/**
 * Hook to wait for organization to be synced to Convex
 * Used after creating an organization to ensure data is ready before proceeding
 */
export function useWaitForOrgSync(clerkUserId: string | undefined) {
  const syncOrganization = useMutation(api.organizations.syncOrganization);
  const syncMembership = useMutation(api.organizations.syncOrganizationMembership);
  const { organization } = useOrganization();

  // This query will automatically re-run when Convex data changes
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    clerkUserId ? { clerkUserId } : 'skip'
  );

  /**
   * Wait for organization with specific Clerk ID to appear in Convex
   * AND ensure membership is synced
   * Retries every 3 seconds until successful
   */
  const waitForOrganization = useCallback(async (
    clerkOrgId: string,
    userId: string,
    role: string = 'org:admin'
  ): Promise<boolean> => {
    console.log('[WaitForSync] Starting sync for org:', clerkOrgId);

    const maxAttempts = 20; // 20 attempts × 3 seconds = 60 seconds max
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`[WaitForSync] Attempt ${attempt}/${maxAttempts}`);

      try {
        // Wait 3 seconds before each attempt (except first)
        if (attempt > 1) {
          console.log('[WaitForSync] Waiting 3 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Check if organization is loaded in Clerk
        if (!organization || organization.id !== clerkOrgId) {
          console.log('[WaitForSync] Organization not loaded in Clerk yet, will retry...');
          continue; // Retry
        }

        console.log('[WaitForSync] Organization found in Clerk, syncing to Convex...');

        // Step 1: Sync the organization to Convex
        await syncOrganization({
          clerkOrganizationId: clerkOrgId,
          name: organization.name,
          slug: organization.slug!,
          imageUrl: organization.imageUrl,
          clerkUserId: userId,
        });
        console.log('[WaitForSync] Organization synced successfully');

        // Step 2: Sync the membership
        await syncMembership({
          clerkOrganizationId: clerkOrgId,
          clerkUserId: userId,
          role: role,
          permissions: [],
        });
        console.log('[WaitForSync] Membership synced successfully');

        // Step 3: Give Convex a moment to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('[WaitForSync] Sync complete! Data is ready.');
        return true;

      } catch (error) {
        console.error(`[WaitForSync] Attempt ${attempt} failed:`, error);
        // Continue to retry unless we've exhausted attempts
        if (attempt >= maxAttempts) {
          console.error('[WaitForSync] Max attempts reached, sync failed');
          return false;
        }
      }
    }

    console.error('[WaitForSync] Failed to sync after all attempts');
    return false;
  }, [syncOrganization, syncMembership, organization]);

  return {
    waitForOrganization,
    userOrganizations,
  };
}
