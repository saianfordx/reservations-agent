import { useEffect, useRef } from 'react';
import { useOrganization, useUser, useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

/**
 * Hook to sync the active Clerk organization with Convex
 * Call this in a top-level component (like layout) to ensure sync
 *
 * Runs silently in the background - does NOT block UI or cause re-renders
 * Convex queries will reactively update when sync completes
 */
export function useOrganizationSync() {
  const { isSignedIn } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();

  // Track synced organizations to prevent duplicate syncs
  const syncedOrgs = useRef(new Set<string>());
  const isSyncingRef = useRef(false);

  const storeUser = useMutation(api.users.store);
  const syncOrganization = useMutation(api.organizations.syncOrganization);
  const syncMembership = useMutation(api.organizations.syncOrganizationMembership);

  useEffect(() => {
    async function sync() {
      // Wait for all Clerk data to be loaded
      if (!orgLoaded || !userLoaded) {
        return;
      }

      // If not signed in, we're done
      if (!isSignedIn) {
        return;
      }

      // If user exists but no organization (personal account), we're done
      if (user && !organization) {
        return;
      }

      // Must have both user and organization to proceed
      if (!user || !organization) {
        return;
      }

      // CRITICAL: Wait for organizationMemberships to load
      // This is loaded asynchronously by Clerk and might not be available immediately
      if (!user.organizationMemberships || user.organizationMemberships.length === 0) {
        console.log('[Sync] Waiting for Clerk organizationMemberships to load...');
        return;
      }

      // Skip if already synced this organization
      const orgKey = `${user.id}-${organization.id}`;
      if (syncedOrgs.current.has(orgKey)) {
        console.log('[Sync] Organization already synced, skipping:', organization.name);
        return;
      }

      // Skip if currently syncing
      if (isSyncingRef.current) {
        console.log('[Sync] Sync already in progress, skipping');
        return;
      }

      try {
        isSyncingRef.current = true;
        console.log('[Sync] Starting background sync for:', organization.name);

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

        // Mark as synced
        syncedOrgs.current.add(orgKey);
        console.log('[Sync] Completed successfully for:', organization.name);
      } catch (error) {
        console.error('[Sync] Error syncing organization:', error);
        // Don't block UI on error - just log it
      } finally {
        isSyncingRef.current = false;
      }
    }

    sync();
  }, [isSignedIn, organization, user, orgLoaded, userLoaded, storeUser, syncOrganization, syncMembership]);

  // Returns nothing - sync runs silently in background
}
