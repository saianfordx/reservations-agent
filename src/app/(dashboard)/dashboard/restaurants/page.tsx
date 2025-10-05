'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/shared/components/ui/button';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Restaurants</h1>
          <p className="text-muted-foreground/80 mt-2">
            Manage your restaurant locations
          </p>
        </div>
        <Link href="/dashboard/restaurants/create">
          <Button size="lg">Create Restaurant</Button>
        </Link>
      </div>

      {!restaurants || restaurants.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="text-4xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold mb-2">No restaurants yet</h3>
          <p className="text-muted-foreground/80 mb-6">
            Create your first restaurant to start managing reservations
          </p>
          <Link href="/dashboard/restaurants/create">
            <Button size="lg">Create Your First Restaurant</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <Link
              key={restaurant._id}
              href={`/dashboard/restaurants/${restaurant._id}`}
            >
              <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent">
                <h3 className="text-lg font-semibold mb-2">
                  {restaurant.name}
                </h3>
                {restaurant.description && (
                  <p className="text-sm text-muted-foreground/80 mb-4 line-clamp-2">
                    {restaurant.description}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/80">📍</span>
                    <span>
                      {restaurant.location.city}, {restaurant.location.state}
                    </span>
                  </div>
                  {restaurant.cuisine && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/80">🍴</span>
                      <span>{restaurant.cuisine}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/80">👥</span>
                    <span>
                      Seats {restaurant.settings.seatingCapacity} people
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      restaurant.status === 'active'
                        ? 'bg-primary/10 text-primary'
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
