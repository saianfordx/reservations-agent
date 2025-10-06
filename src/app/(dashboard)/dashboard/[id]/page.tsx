'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';
import { useReservations } from '@/features/reservations/hooks/useReservations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Phone, Users, Clock } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Id } from '../../../../../convex/_generated/dataModel';
import { getTodayInTimezone, getDateWithOffset, getDateWithMonthOffset } from '@/lib/utils/date';

type TimeRange = 'today' | '7days' | '30days' | '3months';

export default function RestaurantDashboardPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const restaurantId = params.id as Id<'restaurants'>;
  const { restaurant, isLoading } = useRestaurant(restaurantId);
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');

  // Calculate date ranges based on selected time range
  const { startDate, endDate } = useMemo(() => {
    if (!restaurant) {
      // Fallback if restaurant not loaded yet
      return { startDate: '', endDate: '' };
    }

    const timezone = restaurant.location?.timezone;
    const today = getTodayInTimezone(timezone);

    let start = today;

    switch (timeRange) {
      case 'today':
        start = today;
        break;
      case '7days':
        start = getDateWithOffset(-7, timezone);
        break;
      case '30days':
        start = getDateWithOffset(-30, timezone);
        break;
      case '3months':
        start = getDateWithMonthOffset(-3, timezone);
        break;
    }

    return {
      startDate: start,
      endDate: today,
    };
  }, [timeRange, restaurant]);

  const { reservations, isLoading: reservationsLoading } = useReservations(
    restaurantId,
    startDate,
    endDate
  );

  // Auth guard - redirect to sign in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!reservations) return null;

    const totalReservations = reservations.length;
    const totalCalls = reservations.length; // Assuming each reservation = 1 call for now
    const totalPartySize = reservations.reduce((sum, r) => sum + r.partySize, 0);
    const avgPartySize = totalReservations > 0 ? totalPartySize / totalReservations : 0;
    const avgCallTime = 3.5; // Mock data - replace with actual when available

    return {
      totalReservations,
      totalCalls,
      avgCallTime,
      avgPartySize,
    };
  }, [reservations]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!reservations) return [];

    // Group reservations by date
    const groupedByDate: Record<string, number> = {};

    reservations.forEach((reservation) => {
      const date = reservation.date;
      groupedByDate[date] = (groupedByDate[date] || 0) + 1;
    });

    // Create array of all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const data: { date: string; reservations: number }[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        reservations: groupedByDate[dateStr] || 0,
      });
    }

    return data;
  }, [reservations, startDate, endDate]);

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
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Reservations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reservations
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{metrics?.totalReservations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-primary font-medium">+12.5%</span> from last period
            </p>
          </CardContent>
        </Card>

        {/* Total Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Calls
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{metrics?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-destructive font-medium">-2.4%</span> from last period
            </p>
          </CardContent>
        </Card>

        {/* Avg Call Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Call Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{metrics?.avgCallTime.toFixed(1) || 0} min</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-primary font-medium">+0.5 min</span> from last period
            </p>
          </CardContent>
        </Card>

        {/* Avg Party Size */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Party Size
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{metrics?.avgPartySize.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-primary font-medium">+0.3</span> from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-black">Reservations Over Time</CardTitle>
              <CardDescription>
                Total reservations for the selected period
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('3months')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === '3months'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-muted'
                }`}
              >
                Last 3 months
              </button>
              <button
                onClick={() => setTimeRange('30days')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === '30days'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-muted'
                }`}
              >
                Last 30 days
              </button>
              <button
                onClick={() => setTimeRange('7days')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === '7days'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-muted'
                }`}
              >
                Last 7 days
              </button>
              <button
                onClick={() => setTimeRange('today')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === 'today'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-muted'
                }`}
              >
                Today
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReservations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(45, 100%, 51%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(45, 100%, 51%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
                  }}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reservations"
                  stroke="hsl(45, 100%, 51%)"
                  strokeWidth={2}
                  fill="url(#colorReservations)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Recent Reservations</CardTitle>
          <CardDescription>
            List of reservations for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading reservations...</div>
            </div>
          ) : !reservations || reservations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No reservations for this period</div>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.slice(0, 10).map((reservation) => {
                const [hours, minutes] = reservation.time.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                const formattedTime = `${displayHour}:${minutes} ${ampm}`;

                return (
                  <div
                    key={reservation._id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-black">{reservation.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {reservation.date} at {formattedTime}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm font-medium text-black">{reservation.partySize} guests</div>
                        <div className="text-xs text-muted-foreground">
                          {reservation.customerPhone || 'No phone'}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          reservation.status === 'confirmed'
                            ? 'bg-primary/20 text-primary'
                            : reservation.status === 'cancelled'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {reservation.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {reservations.length > 10 && (
                <div className="text-center pt-4">
                  <button className="text-sm text-muted-foreground hover:text-black transition-colors">
                    View all {reservations.length} reservations →
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
