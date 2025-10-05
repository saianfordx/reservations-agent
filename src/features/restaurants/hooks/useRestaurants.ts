'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { RestaurantFormData } from '../types/restaurant.types';

export function useRestaurants() {
  const restaurants = useQuery(api.restaurants.getMyRestaurants);
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
