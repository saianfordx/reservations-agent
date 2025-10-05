'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRestaurant, useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { Button } from '@/shared/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { Id } from '../../../../../../convex/_generated/dataModel';

export default function RestaurantConfigurePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const restaurantId = params.id as Id<'restaurants'>;
  const { restaurant, isLoading } = useRestaurant(restaurantId);
  const { deleteRestaurant } = useRestaurants();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${restaurant.name}"? This will permanently delete the business, all agents, and all reservations. This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteRestaurant({ id: restaurantId });
      router.push('/dashboard/restaurants');
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
      alert('Failed to delete restaurant. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Configure Business</h1>
          <p className="text-muted-foreground mt-2">
            Manage settings for {restaurant.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => alert('Edit functionality coming soon')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Business'}
          </Button>
        </div>
      </div>

      {/* Business Information Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Location */}
        <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all">
          <h3 className="text-lg font-semibold mb-4 text-black">Location</h3>
          <div className="space-y-2 text-sm">
            <div className="text-black">{restaurant.location.address}</div>
            <div className="text-black">
              {restaurant.location.city}, {restaurant.location.state}{' '}
              {restaurant.location.zipCode}
            </div>
            <div className="text-black">{restaurant.location.country}</div>
            <div className="text-muted-foreground mt-2">
              Timezone: {restaurant.location.timezone}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all">
          <h3 className="text-lg font-semibold mb-4 text-black">Contact</h3>
          <div className="space-y-2 text-sm">
            <div className="text-black">📧 {restaurant.contact.email}</div>
            <div className="text-black">📞 {restaurant.contact.phone}</div>
            {restaurant.contact.website && (
              <div className="text-black">🌐 {restaurant.contact.website}</div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all">
          <h3 className="text-lg font-semibold mb-4 text-black">Settings</h3>
          <div className="space-y-2 text-sm">
            <div className="text-black">Seating Capacity: {restaurant.settings.seatingCapacity}</div>
            <div className="text-black">
              Table Turnover: {restaurant.settings.avgTableTurnoverMinutes} min
            </div>
            <div className="text-black">
              Reservation Buffer: {restaurant.settings.reservationBuffer} min
            </div>
            <div className="text-black">
              Party Size: {restaurant.settings.minPartySize}-
              {restaurant.settings.maxPartySize}
            </div>
            <div className="text-black">
              Advance Booking: {restaurant.settings.advanceBookingDays} days
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all">
          <h3 className="text-lg font-semibold mb-4 text-black">Operating Hours</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(restaurant.operatingHours).map(([day, hours]) => (
              <div key={day} className="flex justify-between">
                <span className="capitalize font-medium text-black">{day}</span>
                <span className="text-muted-foreground">
                  {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl bg-destructive/5 border-2 border-destructive/20 p-6">
        <h3 className="text-lg font-semibold mb-2 text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting this business will permanently remove all data including agents, reservations, and settings. This action cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isDeleting ? 'Deleting...' : 'Permanently Delete Business'}
        </Button>
      </div>
    </div>
  );
}
