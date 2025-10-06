import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to get current date/time in restaurant timezone
 */
export async function POST(req: NextRequest) {
  try {
    // Get restaurant and agent IDs from query params
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const agentId = searchParams.get('agentId');

    if (!restaurantId || !agentId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request - missing restaurant or agent information.',
        },
        { status: 400 }
      );
    }

    // Get restaurant from Convex to retrieve timezone
    const convex = getConvexClient();
    const restaurant = await convex.query(api.restaurants.getRestaurantPublic, {
      id: restaurantId as Id<'restaurants'>,
    });

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: 'Restaurant not found.',
        },
        { status: 404 }
      );
    }

    // Get current date/time in restaurant's timezone
    const timezone = restaurant.location.timezone || 'America/New_York';

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const dayOfWeek = parts.find(p => p.type === 'weekday')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '';

    const currentDate = `${year}-${month}-${day}`;
    const currentTime = `${hour}:${minute}`;

    return NextResponse.json({
      success: true,
      message: `Current date and time information retrieved successfully. Today is ${dayOfWeek}, ${currentDate} at ${currentTime} in ${timezone} timezone.`,
      current_date: currentDate,
      current_time: currentTime,
      day_of_week: dayOfWeek,
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      timezone: timezone,
    });
  } catch (error) {
    console.error('Error getting current datetime:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Sorry, I encountered an error while retrieving the current date and time.',
      },
      { status: 500 }
    );
  }
}
