import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to create reservations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_name,
      date,
      time,
      party_size,
      customer_phone,
      special_requests,
    } = body;

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

    console.log('Creating reservation:', body);

    // Validate inputs
    if (!customer_name || !date || !time || !party_size || !customer_phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required information. Please provide customer name, date, time, party size, and phone number.',
        },
        { status: 400 }
      );
    }

    // Get restaurant to check timezone for date validation
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

    // Validate that the date is not in the past
    const timezone = restaurant.location.timezone || 'America/New_York';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const todayFormatted = `${year}-${month}-${day}`;

    // Compare dates
    const reservationDate = new Date(date + 'T00:00:00');
    const todayDate = new Date(todayFormatted + 'T00:00:00');

    if (reservationDate < todayDate) {
      return NextResponse.json(
        {
          success: false,
          message: `I'm sorry, but that date (${date}) is in the past. Please provide a date that is today (${todayFormatted}) or later.`,
        },
        { status: 400 }
      );
    }

    // Create reservation in Convex
    const result = await convex.mutation(api.reservations.create, {
      restaurantId: restaurantId as Id<'restaurants'>,
      agentId: agentId as Id<'agents'>,
      customerName: customer_name,
      date,
      time,
      partySize: party_size,
      customerPhone: customer_phone,
      specialRequests: special_requests,
    });

    return NextResponse.json({
      success: true,
      message: `Perfect! Your reservation is confirmed for ${customer_name} on ${date} at ${time} for ${party_size} guests. Your callback number is ${customer_phone}. Your reservation ID is ${result.reservationId}. To make any changes or cancel this reservation, simply call us with your phone number ${customer_phone}.`,
      reservation_id: result.reservationId,
      customer_name,
      date,
      time,
      party_size,
      customer_phone,
      special_requests,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, I encountered an error while creating your reservation. Please try again.',
      },
      { status: 500 }
    );
  }
}
