'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RestaurantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id;

  useEffect(() => {
    // Redirect to new route structure
    if (restaurantId) {
      router.push(`/dashboard/${restaurantId}`);
    }
  }, [restaurantId, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
