'use client';

import { useRouter } from 'next/navigation';
import { RestaurantForm } from '@/features/restaurants/components/RestaurantForm';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { RestaurantFormData } from '@/features/restaurants/types/restaurant.types';
import { useState } from 'react';

export default function CreateRestaurantPage() {
  const router = useRouter();
  const { createRestaurant } = useRestaurants();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: RestaurantFormData) => {
    try {
      setIsLoading(true);
      await createRestaurant(data);
      router.push('/dashboard/restaurants');
    } catch (error) {
      console.error('Failed to create restaurant:', error);
      alert('Failed to create restaurant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Restaurant</h1>
        <p className="text-muted-foreground/80 mt-2">
          Add your restaurant details to get started with AI reservations
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <RestaurantForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
