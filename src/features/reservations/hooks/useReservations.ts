'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

export function useReservations(
  restaurantId: Id<'restaurants'> | undefined,
  startDate?: string,
  endDate?: string
) {
  const reservations = useQuery(
    api.reservations.listByDateRange,
    restaurantId && startDate && endDate
      ? { restaurantId, startDate, endDate }
      : 'skip'
  );

  return {
    reservations,
    isLoading: reservations === undefined,
  };
}
