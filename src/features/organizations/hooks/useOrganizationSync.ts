import { useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

/**
 * Hook to sync the active Clerk organization with Convex
 * Call this in a top-level component (like layout) to ensure sync
 */
export function useOrganizationSync() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const syncOrganization = useMutation(api.organizations.syncOrganization);
  const syncMembership = useMutation(api.organizations.syncOrganizationMembership);

  useEffect(() => {
    async function sync() {
      // Only sync if user is in an organization (not personal account)
      if (!organization || !user) return;

      try {
        // Sync organization
        await syncOrganization({
          clerkOrganizationId: organization.id,
          name: organization.name,
          slug: organization.slug!,
          imageUrl: organization.imageUrl,
          clerkUserId: user.id,
        });

        // Get user's membership data from Clerk
        // The membership data is in organization.publicUserData for the current user
        const userMembership = user.organizationMemberships?.find(
          (m) => m.organization.id === organization.id
        );

        if (userMembership) {
          // Extract role and permissions
          const role = userMembership.role;
          const permissions = userMembership.permissions || [];

          await syncMembership({
            clerkOrganizationId: organization.id,
            clerkUserId: user.id,
            role: role,
            permissions: permissions,
          });
        }
      } catch (error) {
        console.error('Error syncing organization:', error);
      }
    }

    sync();
  }, [organization, user, syncOrganization, syncMembership]);
}
