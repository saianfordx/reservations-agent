'use client';

import { useState, useEffect } from 'react';
import { Id } from '../../../../convex/_generated/dataModel';

interface RestaurantStats {
  totalCalls: number;
  avgCallTimeMins: number;
  totalMinutes: number;
}

export function useRestaurantStats(restaurantId: Id<'restaurants'>) {
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Fetching stats for restaurant:', restaurantId);
        const response = await fetch(`/api/restaurants/${restaurantId}/stats`);

        console.log('Stats response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Stats API error:', errorText);
          throw new Error('Failed to fetch restaurant statistics');
        }

        const data = await response.json();
        console.log('Stats data received:', data);
        setStats(data);
      } catch (err) {
        console.error('Error in useRestaurantStats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (restaurantId) {
      fetchStats();
    }
  }, [restaurantId]);

  return { stats, isLoading, error };
}
