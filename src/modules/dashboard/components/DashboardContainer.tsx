'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { useRouteProtection } from '@/features/auth/hooks/useRouteProtection';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Calendar, Phone, Users, Clock, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getTodayInTimezone, getDateWithOffset, getDateWithMonthOffset } from '@/lib/utils/date';

type TimeRange = 'today' | '7days' | '30days' | '3months';

export function DashboardContainer() {
  // Route protection - redirect non-admins to their first restaurant
  const { isLoading: protectionLoading, isOrgAdmin } = useRouteProtection({
    requiresAdmin: true, // This page requires admin access
  });

  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');

  // Calculate date ranges using local timezone (since we're showing aggregated data)
  const { startDate, endDate } = useMemo(() => {
    // Use local timezone for aggregated dashboard
    const today = getTodayInTimezone();
    let start = today;

    switch (timeRange) {
      case 'today':
        start = today;
        break;
      case '7days':
        start = getDateWithOffset(-7);
        break;
      case '30days':
        start = getDateWithOffset(-30);
        break;
      case '3months':
        start = getDateWithMonthOffset(-3);
        break;
    }

    return {
      startDate: start,
      endDate: today,
    };
  }, [timeRange]);

  // Fetch reservations for each restaurant (using conditional queries)
  const restaurant1Reservations = useQuery(
    api.reservations.listByDateRange,
    restaurants && restaurants[0] ? { restaurantId: restaurants[0]._id, startDate, endDate } : 'skip'
  );
  const restaurant2Reservations = useQuery(
    api.reservations.listByDateRange,
    restaurants && restaurants[1] ? { restaurantId: restaurants[1]._id, startDate, endDate } : 'skip'
  );
  const restaurant3Reservations = useQuery(
    api.reservations.listByDateRange,
    restaurants && restaurants[2] ? { restaurantId: restaurants[2]._id, startDate, endDate } : 'skip'
  );
  const restaurant4Reservations = useQuery(
    api.reservations.listByDateRange,
    restaurants && restaurants[3] ? { restaurantId: restaurants[3]._id, startDate, endDate } : 'skip'
  );
  const restaurant5Reservations = useQuery(
    api.reservations.listByDateRange,
    restaurants && restaurants[4] ? { restaurantId: restaurants[4]._id, startDate, endDate } : 'skip'
  );

  // Combine all reservations data
  const allReservationsData = useMemo(() => {
    if (!restaurants) return [];

    const allReservations = [
      restaurant1Reservations,
      restaurant2Reservations,
      restaurant3Reservations,
      restaurant4Reservations,
      restaurant5Reservations,
    ].slice(0, restaurants.length);

    return restaurants.map((restaurant, index) => ({
      restaurant,
      reservations: allReservations[index],
    }));
  }, [restaurants, restaurant1Reservations, restaurant2Reservations, restaurant3Reservations, restaurant4Reservations, restaurant5Reservations]);

  // Calculate aggregated metrics
  const metrics = useMemo(() => {
    if (!allReservationsData) return null;

    let totalReservations = 0;
    let totalCalls = 0;
    let totalPartySize = 0;

    allReservationsData.forEach(({ reservations }) => {
      if (reservations) {
        totalReservations += reservations.length;
        totalCalls += reservations.length; // Assuming each reservation = 1 call
        totalPartySize += reservations.reduce((sum, r) => sum + r.partySize, 0);
      }
    });

    const avgPartySize = totalReservations > 0 ? totalPartySize / totalReservations : 0;
    const avgCallTime = 3.5; // Mock data

    return {
      totalReservations,
      totalCalls,
      avgCallTime,
      avgPartySize,
    };
  }, [allReservationsData]);

  // Prepare comparison chart data
  const comparisonData = useMemo(() => {
    if (!allReservationsData) return [];

    return allReservationsData.map(({ restaurant, reservations }) => ({
      name: restaurant.name,
      reservations: reservations?.length || 0,
      calls: reservations?.length || 0, // Assuming each reservation = 1 call
    }));
  }, [allReservationsData]);

  const isLoading = protectionLoading || restaurantsLoading;

  // Show loading while checking permissions or fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Only admins should see this page (hook will redirect others)
  if (!isOrgAdmin) {
    return null; // Will be redirected by the hook
  }

  if (!restaurants) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading restaurants...</div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h2 className="mb-2 text-2xl font-bold text-black">Welcome to AI Reservations</h2>
          <p className="text-muted-foreground">
            Manage your restaurant AI agents and reservations from this dashboard.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Agents
                </p>
                <p className="text-3xl font-bold text-black">0</p>
              </div>
              <div className="text-4xl">🤖</div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reservations Today
                </p>
                <p className="text-3xl font-bold text-black">0</p>
              </div>
              <div className="text-4xl">📅</div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Minutes This Month
                </p>
                <p className="text-3xl font-bold text-black">0</p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h3 className="mb-4 text-lg font-semibold text-black">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/dashboard/restaurants/create"
              className="flex items-center gap-4 rounded-xl bg-white p-4 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <div className="text-3xl">🍽️</div>
              <div>
                <p className="font-medium text-black">Create Restaurant</p>
                <p className="text-sm text-muted-foreground">
                  Add a new restaurant location
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/agents/create"
              className="flex items-center gap-4 rounded-xl bg-white p-4 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <div className="text-3xl">🤖</div>
              <div>
                <p className="font-medium text-black">Create AI Agent</p>
                <p className="text-sm text-muted-foreground">
                  Set up an AI agent for reservations
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Getting Started */}
        <div className="rounded-xl bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h3 className="mb-4 text-lg font-semibold text-black">Getting Started</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-black">
                1
              </div>
              <div>
                <p className="font-medium text-black">Create your first restaurant</p>
                <p className="text-muted-foreground">
                  Add your restaurant details and operating hours
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-black">
                2
              </div>
              <div>
                <p className="font-medium text-black">Set up your AI agent</p>
                <p className="text-muted-foreground">
                  Choose a voice and upload your menu
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-black">
                3
              </div>
              <div>
                <p className="font-medium text-black">Go live</p>
                <p className="text-muted-foreground">
                  Get your phone number and start taking calls
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  // Show aggregated view when restaurants exist
  return (
    <div className="space-y-6">
      {/* Dashboard Title */}
      <h1 className="text-3xl font-bold text-black">Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Comparison Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-black">Business Performance Comparison</CardTitle>
              <CardDescription>
                Compare calls and reservations across all your businesses
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
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
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
                <Legend />
                <Bar dataKey="reservations" fill="hsl(45, 100%, 51%)" name="Reservations" radius={[4, 4, 0, 0]} />
                <Bar dataKey="calls" fill="hsl(220, 70%, 50%)" name="Calls" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
