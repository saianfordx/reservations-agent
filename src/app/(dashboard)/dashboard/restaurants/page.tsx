'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';

export default function RestaurantsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { restaurants, isLoading } = useRestaurants();

  // Auth guard - redirect to sign in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground/80">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground/80">Loading restaurants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Businesses</h1>
        <p className="text-muted-foreground mt-2">
          Manage your business locations
        </p>
      </div>

      {!restaurants || restaurants.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="text-4xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold mb-2 text-black">No businesses yet</h3>
          <p className="text-muted-foreground">
            Create your first business using the Add button in the left sidebar
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <Link
              key={restaurant._id}
              href={`/dashboard/restaurants/${restaurant._id}`}
            >
              <div className="rounded-xl bg-card p-6 transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <h3 className="text-lg font-semibold mb-2 text-black">
                  {restaurant.name}
                </h3>
                {restaurant.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {restaurant.description}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📍</span>
                    <span className="text-black">
                      {restaurant.location.city}, {restaurant.location.state}
                    </span>
                  </div>
                  {restaurant.cuisine && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">🍴</span>
                      <span className="text-black">{restaurant.cuisine}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">👥</span>
                    <span className="text-black">
                      Seats {restaurant.settings.seatingCapacity} people
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                      restaurant.status === 'active'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {restaurant.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
