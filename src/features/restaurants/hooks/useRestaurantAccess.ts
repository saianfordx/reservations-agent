'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

/**
 * Hook to get members with access to a restaurant
 */
export function useRestaurantMembers(restaurantId: Id<'restaurants'> | undefined) {
  const members = useQuery(
    api.restaurantAccess.getRestaurantMembers,
    restaurantId ? { restaurantId } : 'skip'
  );

  return {
    members,
    isLoading: members === undefined,
  };
}

/**
 * Hook to get current user's access to a restaurant
 */
export function useUserRestaurantAccess(restaurantId: Id<'restaurants'> | undefined) {
  const access = useQuery(
    api.restaurantAccess.getUserRestaurantAccess,
    restaurantId ? { restaurantId } : 'skip'
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessWithImplicit = access as any;

  // If no restaurantId provided, we're not loading - we just don't have a restaurant context
  const isActuallyLoading = restaurantId ? access === undefined : false;

  return {
    access,
    isLoading: isActuallyLoading,
    hasAccess: !!access,
    role: access?.role,
    permissions: access?.permissions || [],
    isImplicit: accessWithImplicit?.isImplicit || false,
  };
}

/**
 * Hook to manage restaurant access (grant/revoke)
 */
export function useRestaurantAccessManagement() {
  const grantAccess = useMutation(api.restaurantAccess.grantRestaurantAccess);
  const revokeAccess = useMutation(api.restaurantAccess.revokeRestaurantAccess);

  return {
    grantAccess,
    revokeAccess,
  };
}

/**
 * Hook to check if user has a specific permission for a restaurant
 */
export function useRestaurantPermission(
  restaurantId: Id<'restaurants'> | undefined,
  permission: string
) {
  const { permissions, isLoading } = useUserRestaurantAccess(restaurantId);

  return {
    hasPermission: permissions.includes(permission),
    isLoading,
  };
}
