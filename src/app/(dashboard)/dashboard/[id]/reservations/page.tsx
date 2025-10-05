'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';
import { useReservations } from '@/features/reservations/hooks/useReservations';
import { Id } from '../../../../../../convex/_generated/dataModel';

export default function RestaurantReservationsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const restaurantId = params.id as Id<'restaurants'>;
  const { restaurant, isLoading } = useRestaurant(restaurantId);

  // Get date range for reservations (30 days from now)
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  const { reservations, isLoading: reservationsLoading } = useReservations(
    restaurantId,
    today.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading restaurant...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Restaurant not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Reservations</h1>
        <p className="text-muted-foreground mt-2">
          View all reservations for {restaurant.name}
        </p>
      </div>

      {/* Reservations List */}
      {reservationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading reservations...</div>
        </div>
      ) : !reservations || reservations.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-xl font-semibold mb-2 text-black">No reservations</h3>
          <p className="text-muted-foreground">
            No reservations found for this business
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => {
            const [hours, minutes] = reservation.time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const formattedTime = `${displayHour}:${minutes} ${ampm}`;

            return (
              <div
                key={reservation._id}
                className="rounded-xl bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-primary">
                          {formattedTime}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {reservation.date}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-black">
                        {reservation.customerName}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="flex items-center gap-1">
                        <span className="text-muted-foreground">👥</span>
                        <span className="text-black">{reservation.partySize} people</span>
                      </span>
                    </div>

                    {reservation.customerPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">📞</span>
                        <span className="text-muted-foreground">
                          {reservation.customerPhone}
                        </span>
                      </div>
                    )}

                    {reservation.specialRequests && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Note:</span>{' '}
                        {reservation.specialRequests}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                        reservation.status === 'confirmed'
                          ? 'bg-primary/20 text-primary'
                          : reservation.status === 'cancelled'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {reservation.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID: {reservation.reservationId}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
