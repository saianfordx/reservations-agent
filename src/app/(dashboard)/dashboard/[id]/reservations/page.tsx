'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/shared/components/ui/button';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';
import { useReservations } from '@/features/reservations/hooks/useReservations';
import { CreateReservationDialog } from '@/features/reservations/components/CreateReservationDialog';
import { Id } from '../../../../../../convex/_generated/dataModel';

type FilterPeriod = 'today' | 'week' | '15days' | 'month';

export default function RestaurantReservationsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const restaurantId = params.id as Id<'restaurants'>;
  const { restaurant, isLoading } = useRestaurant(restaurantId);
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('month');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedDate, setSelectedDate] = useState<string>('');

  const { reservations, isLoading: reservationsLoading } = useReservations(
    restaurantId,
    dateRange.startDate,
    dateRange.endDate
  );

  // Auth guard - redirect to sign in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Get today's date in the restaurant's timezone
  const getTodayInRestaurantTZ = (): string => {
    if (!restaurant?.location?.timezone) {
      // Fallback to local timezone
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Get current date/time in restaurant's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: restaurant.location.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';

    return `${year}-${month}-${day}`;
  };

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate date range based on selected period
  useEffect(() => {
    if (!restaurant) return;

    const todayStr = getTodayInRestaurantTZ();
    const [year, month, day] = todayStr.split('-').map(Number);
    const today = new Date(year, month - 1, day);

    const start = new Date(today);
    const end = new Date(today);

    switch (selectedPeriod) {
      case 'today':
        break;
      case 'week':
        end.setDate(end.getDate() + 7);
        break;
      case '15days':
        end.setDate(end.getDate() + 15);
        break;
      case 'month':
        end.setDate(end.getDate() + 30);
        break;
    }

    setDateRange({
      startDate: formatDate(start),
      endDate: formatDate(end),
    });
    setSelectedDate(formatDate(start));
  }, [selectedPeriod, restaurant]);

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

  // Group reservations by date
  const groupedReservations = reservations?.reduce((acc, reservation) => {
    const date = reservation.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(reservation);
    return acc;
  }, {} as Record<string, typeof reservations>) || {};

  // Sort reservations within each date by time
  Object.keys(groupedReservations).forEach((date) => {
    groupedReservations[date].sort((a, b) => a.time.localeCompare(b.time));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Reservations</h1>
          <p className="text-muted-foreground mt-2">
            {restaurant.name}
          </p>
        </div>
        <CreateReservationDialog
          restaurantId={restaurantId}
          onSuccess={() => {
            // Refresh is automatic via Convex reactivity
            // Optionally expand the date range to show the new reservation
            setSelectedPeriod('month');
          }}
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-3">
        <Button
          variant={selectedPeriod === 'today' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('today')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
        >
          Today
        </Button>
        <Button
          variant={selectedPeriod === 'week' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('week')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
        >
          This Week
        </Button>
        <Button
          variant={selectedPeriod === '15days' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('15days')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
        >
          15 Days
        </Button>
        <Button
          variant={selectedPeriod === 'month' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('month')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
        >
          1 Month
        </Button>
      </div>

      {/* Reservations View */}
      {reservationsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground/80">Loading reservations...</div>
        </div>
      ) : selectedPeriod === 'today' ? (
        // Today view: Just show the list for today
        <div className="space-y-6">
          {(() => {
            const todayStr = getTodayInRestaurantTZ();
            const [year, month, day] = todayStr.split('-').map(Number);
            const today = new Date(year, month - 1, day);
            const dayOfWeek = today.toLocaleDateString('en-US', {
              weekday: 'long',
            });
            const formattedDate = today.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            const dayReservations = groupedReservations[todayStr] || [];

            return (
              <div className="space-y-3">
                {/* Date Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      {dayOfWeek}
                      <span className="ml-2 text-sm font-normal text-primary">
                        (Today)
                      </span>
                    </h2>
                    <span className="text-muted-foreground/80">
                      {formattedDate}
                    </span>
                    <span className="ml-auto text-sm text-muted-foreground/80">
                      {dayReservations.length} reservation
                      {dayReservations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-px bg-border mt-2" />
                </div>

                {/* Reservations for today */}
                {dayReservations.length === 0 ? (
                  <div className="rounded-xl bg-card p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                    <p className="text-sm text-muted-foreground">
                      No reservations today
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {dayReservations.map((reservation) => {
                      const [hours, minutes] = reservation.time.split(':');
                      const hour = parseInt(hours);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour % 12 || 12;
                      const formattedTime = `${displayHour}:${minutes} ${ampm}`;

                      return (
                        <div
                          key={reservation._id}
                          className="rounded-xl bg-card p-5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-semibold text-primary">
                                    {formattedTime}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-black">
                                    {reservation.customerName}
                                  </span>
                                  <span className="text-muted-foreground">
                                    •
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground">
                                      👥
                                    </span>
                                    <span className="text-black">{reservation.partySize} people</span>
                                  </span>
                                </div>
                              </div>

                              {reservation.customerPhone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">
                                    📞
                                  </span>
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
          })()}
        </div>
      ) : (
        // Week/15days/Month view: Calendar on left, list on right
        <div className="flex gap-6">
          {/* Calendar View - Left Panel */}
          <div className="w-[420px] flex-shrink-0">
            <div className="rounded-xl bg-card p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] sticky top-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-lg text-black">
                    {new Date(dateRange.startDate).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {/* Calendar days */}
                  {(() => {
                    const start = new Date(dateRange.startDate);
                    const firstDay = new Date(
                      start.getFullYear(),
                      start.getMonth(),
                      1
                    );
                    const lastDay = new Date(
                      start.getFullYear(),
                      start.getMonth() + 1,
                      0
                    );

                    // Add empty cells for days before the first day of the month
                    const startDayOfWeek = firstDay.getDay();
                    const days = [];

                    // Empty cells
                    for (let i = 0; i < startDayOfWeek; i++) {
                      days.push(
                        <div
                          key={`empty-${i}`}
                          className="aspect-square p-2"
                        />
                      );
                    }

                    // Actual days
                    const todayStr = getTodayInRestaurantTZ();
                    for (let day = 1; day <= lastDay.getDate(); day++) {
                      const dateObj = new Date(
                        start.getFullYear(),
                        start.getMonth(),
                        day
                      );
                      const dateStr = formatDate(dateObj);
                      const isInRange =
                        dateStr >= dateRange.startDate &&
                        dateStr <= dateRange.endDate;
                      const isSelected = dateStr === selectedDate;
                      const isToday = dateStr === todayStr;
                      const hasReservations =
                        groupedReservations[dateStr]?.length > 0;

                      days.push(
                        <button
                          key={day}
                          onClick={() => setSelectedDate(dateStr)}
                          disabled={!isInRange}
                          className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all relative ${
                            !isInRange
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary text-black shadow-[0_4px_12px_rgba(253,224,71,0.4)]'
                              : isToday
                              ? 'text-primary hover:bg-accent shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              : 'text-black hover:bg-accent hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                          }`}
                        >
                          {day}
                          {hasReservations && isInRange && (
                            <div
                              className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-primary-foreground' : 'bg-primary'
                              }`}
                            />
                          )}
                        </button>
                      );
                    }

                    return days;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Reservations Panel - Right Side */}
          <div className="flex-1 min-w-0">
            {(() => {
              // Parse selected date string (YYYY-MM-DD) to get correct date
              const [year, month, day] = selectedDate.split('-').map(Number);
              const dateObj = new Date(year, month - 1, day);
              const todayStr = getTodayInRestaurantTZ();
              const isToday = selectedDate === todayStr;
              const dayOfWeek = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
              });
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
              const dayReservations = groupedReservations[selectedDate] || [];

              return (
                <>
                  {/* Date Header */}
                  <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-black">
                        {dayOfWeek}
                        {isToday && (
                          <span className="ml-2 text-sm font-normal text-primary">
                            (Today)
                          </span>
                        )}
                      </h2>
                      <span className="text-muted-foreground">
                        {formattedDate}
                      </span>
                      <span className="ml-auto text-sm text-muted-foreground">
                        {dayReservations.length} reservation
                        {dayReservations.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-px bg-muted mt-2" />
                  </div>

                  {/* Reservations for selected date */}
                  {dayReservations.length === 0 ? (
                    <div className="rounded-xl bg-card p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                      <p className="text-sm text-muted-foreground">
                        No reservations
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {dayReservations.map((reservation) => {
                        const [hours, minutes] = reservation.time.split(':');
                        const hour = parseInt(hours);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour % 12 || 12;
                        const formattedTime = `${displayHour}:${minutes} ${ampm}`;

                        return (
                          <div
                            key={reservation._id}
                            className="rounded-xl bg-card p-5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-primary">
                                      {formattedTime}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-black">
                                      {reservation.customerName}
                                    </span>
                                    <span className="text-muted-foreground">
                                      •
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-muted-foreground">
                                        👥
                                      </span>
                                      <span className="text-black">
                                        {reservation.partySize} people
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {reservation.customerPhone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">
                                      📞
                                    </span>
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
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
