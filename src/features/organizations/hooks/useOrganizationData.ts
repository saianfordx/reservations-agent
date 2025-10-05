import { useOrganization, useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

/**
 * Hook to get organization data from Convex
 */
export function useOrganizationData() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();

  const convexOrganization = useQuery(
    api.organizations.getOrganizationByClerkId,
    organization ? { clerkOrganizationId: organization.id } : 'skip'
  );

  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user ? { clerkUserId: user.id } : 'skip'
  );

  const userRole = useQuery(
    api.organizations.getUserOrganizationRole,
    organization && user
      ? {
          clerkUserId: user.id,
          clerkOrganizationId: organization.id,
        }
      : 'skip'
  );

  const userPermissions = useQuery(
    api.organizations.getUserOrganizationPermissions,
    organization && user
      ? {
          clerkUserId: user.id,
          clerkOrganizationId: organization.id,
        }
      : 'skip'
  );

  const organizationMembers = useQuery(
    api.organizations.getOrganizationMembers,
    convexOrganization ? { organizationId: convexOrganization._id } : 'skip'
  );

  // Permission checking helper
  const hasPermission = (permission: string): boolean => {
    if (!userRole || !userPermissions) return false;

    // Admins have all permissions
    if (userRole === 'org:admin' || userRole === 'admin') {
      return true;
    }

    return userPermissions.includes(permission);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!userRole || !userPermissions) return false;

    // Admins have all permissions
    if (userRole === 'org:admin' || userRole === 'admin') {
      return true;
    }

    return permissions.some(p => userPermissions.includes(p));
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!userRole || !userPermissions) return false;

    // Admins have all permissions
    if (userRole === 'org:admin' || userRole === 'admin') {
      return true;
    }

    return permissions.every(p => userPermissions.includes(p));
  };

  return {
    // Clerk data
    clerkOrganization: organization,
    clerkUser: user,
    isLoaded: orgLoaded && userLoaded,

    // Convex data
    convexOrganization,
    userOrganizations,
    userRole,
    userPermissions,
    organizationMembers,

    // Derived state
    isAdmin: userRole === 'org:admin' || userRole === 'admin',
    isMember: !!userRole,
    hasOrganization: !!organization,

    // Permission helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
