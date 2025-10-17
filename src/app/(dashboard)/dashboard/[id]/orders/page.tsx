'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import { Search } from 'lucide-react';

type FilterPeriod = 'today' | 'week' | '15days' | 'month';

export default function RestaurantOrdersPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const restaurantId = params.id as Id<'restaurants'>;
  const { restaurant, isLoading } = useRestaurant(restaurantId);
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('month');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const orders = useQuery(
    api.orders.listByDateRange,
    dateRange.startDate && dateRange.endDate
      ? {
          restaurantId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : 'skip'
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

  // Filter orders based on search query
  const filteredOrders = orders?.filter((order) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = order.customerName.toLowerCase().includes(query);
    const phoneMatch = order.customerPhone?.toLowerCase().includes(query);
    const orderIdMatch = order.orderId.toLowerCase().includes(query);

    return nameMatch || phoneMatch || orderIdMatch;
  }) || [];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-black">To-Go Orders</h1>
          <p className="text-muted-foreground mt-1 lg:mt-2 text-sm lg:text-base">
            {restaurant.name}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
        <Button
          variant={selectedPeriod === 'today' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('today')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex-shrink-0 text-sm lg:text-base"
        >
          Today
        </Button>
        <Button
          variant={selectedPeriod === 'week' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('week')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex-shrink-0 text-sm lg:text-base whitespace-nowrap"
        >
          This Week
        </Button>
        <Button
          variant={selectedPeriod === '15days' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('15days')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex-shrink-0 text-sm lg:text-base"
        >
          15 Days
        </Button>
        <Button
          variant={selectedPeriod === 'month' ? 'default' : 'outline'}
          onClick={() => setSelectedPeriod('month')}
          className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex-shrink-0 text-sm lg:text-base"
        >
          1 Month
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, phone number, or order ID..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="pl-10 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {!orders ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground/80">Loading orders...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl bg-card p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No orders found matching your search' : 'No orders for this period'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => {
              // Format pickup time if available
              let formattedPickupTime = 'ASAP';
              if (order.pickupTime) {
                const [hours, minutes] = order.pickupTime.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                formattedPickupTime = `${displayHour}:${minutes} ${ampm}`;
              }

              // Format pickup date if available
              let formattedPickupDate = '';
              if (order.pickupDate) {
                const [year, month, day] = order.pickupDate.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day);
                formattedPickupDate = dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }

              return (
                <div
                  key={order._id}
                  className="rounded-xl bg-card p-3 lg:p-5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:justify-between gap-3 lg:gap-0">
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base lg:text-lg font-semibold text-primary">
                            {formattedPickupTime}
                          </span>
                          {formattedPickupDate && (
                            <>
                              <span className="text-muted-foreground hidden lg:inline">•</span>
                              <span className="text-sm text-muted-foreground">{formattedPickupDate}</span>
                            </>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm lg:text-base text-black">
                            {order.customerName}
                          </span>
                        </div>
                      </div>

                      {order.customerPhone && (
                        <div className="flex items-center gap-2 text-xs lg:text-sm">
                          <span className="text-muted-foreground">📞</span>
                          <span className="text-muted-foreground">{order.customerPhone}</span>
                        </div>
                      )}

                      {/* Order Items */}
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Order Items:</div>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-black font-medium">{item.quantity}x</span>
                            <div className="flex-1">
                              <span className="text-black">{item.name}</span>
                              {item.specialInstructions && (
                                <div className="text-xs text-muted-foreground italic">
                                  {item.specialInstructions}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.orderNotes && (
                        <div className="text-xs lg:text-sm text-muted-foreground">
                          <span className="font-medium">Note:</span> {order.orderNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex lg:flex-col items-center lg:items-end gap-2 w-full lg:w-auto justify-between lg:justify-start">
                      <span
                        className={`inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                          order.status === 'confirmed'
                            ? 'bg-primary/20 text-primary'
                            : order.status === 'cancelled'
                            ? 'bg-destructive/20 text-destructive'
                            : order.status === 'ready'
                            ? 'bg-green-500/20 text-green-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ID: {order.orderId}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
