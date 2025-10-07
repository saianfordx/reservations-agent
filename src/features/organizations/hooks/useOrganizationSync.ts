import { useEffect, useState } from 'react';
import { useOrganization, useUser, useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

/**
 * Hook to sync the active Clerk organization with Convex
 * Call this in a top-level component (like layout) to ensure sync
 *
 * Returns:
 * - isSyncing: true while initial sync is in progress
 * - syncError: error message if sync failed
 */
export function useOrganizationSync() {
  const { isSignedIn } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const storeUser = useMutation(api.users.store);
  const syncOrganization = useMutation(api.organizations.syncOrganization);
  const syncMembership = useMutation(api.organizations.syncOrganizationMembership);

  useEffect(() => {
    async function sync() {
      // Wait for all Clerk data to be loaded
      if (!orgLoaded || !userLoaded) {
        setIsSyncing(true);
        return;
      }

      // If not signed in, we're done
      if (!isSignedIn) {
        setIsSyncing(false);
        return;
      }

      // If user exists but no organization (personal account), we're done
      if (user && !organization) {
        setIsSyncing(false);
        return;
      }

      // Must have both user and organization to proceed
      if (!user || !organization) {
        setIsSyncing(true);
        return;
      }

      // CRITICAL: Wait for organizationMemberships to load
      // This is loaded asynchronously by Clerk and might not be available immediately
      if (!user.organizationMemberships || user.organizationMemberships.length === 0) {
        console.log('Waiting for Clerk organizationMemberships to load...');
        setIsSyncing(true);
        return;
      }

      try {
        setIsSyncing(true);
        setSyncError(null);

        // Step 1: Ensure user exists in Convex
        await storeUser();

        // Step 2: Sync organization
        await syncOrganization({
          clerkOrganizationId: organization.id,
          name: organization.name,
          slug: organization.slug!,
          imageUrl: organization.imageUrl,
          clerkUserId: user.id,
        });

        // Step 3: Get user's membership data from Clerk
        const userMembership = user.organizationMemberships.find(
          (m) => m.organization.id === organization.id
        );

        if (!userMembership) {
          throw new Error('User membership not found in Clerk data');
        }

        // Step 4: Sync membership with role and permissions
        const role = userMembership.role;
        const permissions = userMembership.permissions || [];

        await syncMembership({
          clerkOrganizationId: organization.id,
          clerkUserId: user.id,
          role: role,
          permissions: permissions,
        });

        console.log('Organization sync completed successfully');
        setIsSyncing(false);
      } catch (error) {
        console.error('Error syncing organization:', error);
        setSyncError(error instanceof Error ? error.message : 'Failed to sync organization');
        setIsSyncing(false);
      }
    }

    sync();
  }, [isSignedIn, organization, user, orgLoaded, userLoaded, storeUser, syncOrganization, syncMembership]);

  return { isSyncing, syncError };
}
