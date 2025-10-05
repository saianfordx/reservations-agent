'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateRestaurantPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to restaurants page - the wizard is now in the sidebar
    router.push('/dashboard/restaurants');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
