'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/shared/components/ui/button';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { useReservations } from '@/features/reservations/hooks/useReservations';

type FilterPeriod = 'today' | 'week' | '15days' | 'month';

export default function ReservationsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('today');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Get the first restaurant (you can add a selector later)
  const selectedRestaurant = restaurants?.[0];

  const { reservations, isLoading: reservationsLoading } = useReservations(
    selectedRestaurant?._id,
    dateRange.startDate,
    dateRange.endDate
  );

  // Auth guard
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Calculate date range based on selected period
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    const end = new Date(today);

    switch (selectedPeriod) {
      case 'today':
        // Start and end are the same day
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

    const todayStr = start.toISOString().split('T')[0];
    setDateRange({
      startDate: todayStr,
      endDate: end.toISOString().split('T')[0],
    });
    setSelectedDate(todayStr);
  }, [selectedPeriod]);

  // Show loading while checking auth
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground/80">Loading...</div>
      </div>
    );
  }

  if (restaurantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground/80">Loading...</div>
      </div>
    );
  }

  if (!selectedRestaurant) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reservations</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your reservations
          </p>
        </div>
        <div className="rounded-xl bg-card p-12 text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="text-4xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold mb-2 text-black">No restaurant found</h3>
          <p className="text-muted-foreground mb-6">
            Create a restaurant first to see reservations
          </p>
          <Button onClick={() => router.push('/dashboard/restaurants/create')}>
            Create Restaurant
          </Button>
        </div>
      </div>
    );
  }

  // Generate all dates in the range
  const allDates: string[] = [];
  if (dateRange.startDate && dateRange.endDate) {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const current = new Date(start);

    while (current <= end) {
      allDates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
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
            {selectedRestaurant.name}
          </p>
        </div>
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
            const todayStr = new Date().toISOString().split('T')[0];
            const dateObj = new Date(todayStr);
            const dayOfWeek = dateObj.toLocaleDateString('en-US', {
              weekday: 'long',
            });
            const formattedDate = dateObj.toLocaleDateString('en-US', {
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
        <div className="grid grid-cols-[380px,1fr] gap-6">
          {/* Calendar View */}
          <div className="rounded-xl bg-card p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
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
                  for (let day = 1; day <= lastDay.getDate(); day++) {
                    const dateObj = new Date(
                      start.getFullYear(),
                      start.getMonth(),
                      day
                    );
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const isInRange =
                      dateStr >= dateRange.startDate &&
                      dateStr <= dateRange.endDate;
                    const isSelected = dateStr === selectedDate;
                    const isToday =
                      dateStr === new Date().toISOString().split('T')[0];
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

          {/* Reservations List for Selected Date */}
          <div className="space-y-3">
            {(() => {
              const dateObj = new Date(selectedDate);
              const isToday =
                dateObj.toISOString().split('T')[0] ===
                new Date().toISOString().split('T')[0];
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
