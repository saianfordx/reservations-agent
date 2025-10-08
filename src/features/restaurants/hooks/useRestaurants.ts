'use client';

import { useQuery, useMutation } from 'convex/react';
import { useOrganization, useAuth, useUser } from '@clerk/nextjs';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { RestaurantFormData } from '../types/restaurant.types';

export function useRestaurants() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  // Check if membership exists in Convex before querying
  const hasAccess = useQuery(
    api.organizations.hasOrganizationAccess,
    isSignedIn && orgLoaded && organization && user
      ? {
          clerkUserId: user.id,
          clerkOrganizationId: organization.id,
        }
      : 'skip'
  );

  // Only query restaurants if:
  // 1. User is signed in
  // 2. Organization is loaded
  // 3. Organization exists
  // 4. Membership has been synced to Convex (hasAccess === true)
  const shouldQuery = isSignedIn && orgLoaded && organization && hasAccess === true;

  const restaurants = useQuery(
    api.restaurants.getMyRestaurants,
    shouldQuery
      ? { clerkOrganizationId: organization.id }
      : 'skip'
  );
  const createMutation = useMutation(api.restaurants.createRestaurant);
  const updateMutation = useMutation(api.restaurants.updateRestaurant);
  const deleteMutation = useMutation(api.restaurants.deleteRestaurant);

  return {
    restaurants,
    isLoading: hasAccess === undefined || restaurants === undefined,
    createRestaurant: createMutation,
    updateRestaurant: updateMutation,
    deleteRestaurant: deleteMutation,
  };
}

export function useRestaurant(id: Id<'restaurants'> | undefined) {
  const restaurant = useQuery(
    api.restaurants.getRestaurant,
    id ? { id } : 'skip'
  );

  return {
    restaurant,
    isLoading: restaurant === undefined,
  };
}
