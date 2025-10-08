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
   */
  const waitForOrganization = useCallback(async (
    clerkOrgId: string,
    userId: string,
    role: string = 'org:admin'
  ): Promise<boolean> => {
    console.log('[WaitForSync] Starting sync for org:', clerkOrgId);

    try {
      // Step 1: Sync the organization to Convex FIRST
      // We need the org to exist before we can create the membership
      console.log('[WaitForSync] Syncing organization to Convex...');

      // Get org details from Clerk
      if (!organization || organization.id !== clerkOrgId) {
        console.error('[WaitForSync] Organization not loaded in Clerk yet');
        // Wait a bit for Clerk to load the org
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await syncOrganization({
        clerkOrganizationId: clerkOrgId,
        name: organization?.name || 'New Organization',
        slug: organization?.slug || clerkOrgId.toLowerCase(),
        imageUrl: organization?.imageUrl,
        clerkUserId: userId,
      });
      console.log('[WaitForSync] Organization synced successfully');

      // Step 2: Now sync the membership
      // This requires the org to exist in Convex first
      console.log('[WaitForSync] Syncing membership...');
      await syncMembership({
        clerkOrganizationId: clerkOrgId,
        clerkUserId: userId,
        role: role,
        permissions: [],
      });
      console.log('[WaitForSync] Membership synced successfully');

      // Step 3: Give Convex a moment to propagate the changes
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[WaitForSync] Sync complete, ready to proceed');
      return true;

    } catch (error) {
      console.error('[WaitForSync] Error during sync:', error);
      return false;
    }
  }, [syncOrganization, syncMembership, organization]);

  return {
    waitForOrganization,
    userOrganizations,
  };
}
