import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to edit reservations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservation_id, date, time, party_size } = body;

    // Get restaurant ID from query params
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request - missing restaurant information.',
        },
        { status: 400 }
      );
    }

    console.log('Editing reservation:', body);

    if (!reservation_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide your reservation ID.',
        },
        { status: 400 }
      );
    }

    // If date is being changed, validate that the new date is not in the past
    const convex = getConvexClient();

    if (date) {
      // Get restaurant to check timezone for date validation
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
    }

    // Update reservation in Convex
    await convex.mutation(api.reservations.update, {
      restaurantId: restaurantId as Id<'restaurants'>,
      reservationId: reservation_id,
      date,
      time,
      partySize: party_size,
    });

    const updates = [];
    if (date) updates.push(`date to ${date}`);
    if (time) updates.push(`time to ${time}`);
    if (party_size) updates.push(`party size to ${party_size} guests`);

    return NextResponse.json({
      success: true,
      message: `Reservation ${reservation_id} has been updated. Changed: ${updates.join(', ')}.`,
      reservation_id,
      updated_fields: { date, time, party_size },
    });
  } catch (error) {
    console.error('Error editing reservation:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        message:
          errorMessage.includes('not found')
            ? `Reservation was not found. Please check your reservation ID and try again.`
            : 'Sorry, I encountered an error while updating your reservation. Please try again.',
      },
      { status: 500 }
    );
  }
}
