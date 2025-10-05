'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

export function useAgents(restaurantId: Id<'restaurants'>) {
  const agents = useQuery(api.agents.getByRestaurant, { restaurantId });

  return {
    agents,
    isLoading: agents === undefined,
  };
}
