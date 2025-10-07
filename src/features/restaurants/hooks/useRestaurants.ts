'use client';

import { useQuery, useMutation } from 'convex/react';
import { useOrganization, useAuth } from '@clerk/nextjs';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { RestaurantFormData } from '../types/restaurant.types';

export function useRestaurants() {
  const { isSignedIn } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  // Wait for organization context to be loaded before querying
  // This is critical for invited members where membership needs to be synced first
  const shouldQuery = isSignedIn && orgLoaded;

  const restaurants = useQuery(
    api.restaurants.getMyRestaurants,
    shouldQuery
      ? { clerkOrganizationId: organization?.id }
      : 'skip'
  );
  const createMutation = useMutation(api.restaurants.createRestaurant);
  const updateMutation = useMutation(api.restaurants.updateRestaurant);
  const deleteMutation = useMutation(api.restaurants.deleteRestaurant);

  return {
    restaurants,
    isLoading: restaurants === undefined,
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
