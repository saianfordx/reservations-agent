import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to search for reservations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, date, customer_phone } = body;

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

    console.log('Searching reservations:', body);

    // At least one search criteria must be provided
    if (!customer_name && !date && !customer_phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide at least one search criteria: customer name, date, or phone number.',
        },
        { status: 400 }
      );
    }

    // Search for reservations in Convex
    const convex = getConvexClient();
    const results = await convex.query(api.reservations.searchReservations, {
      restaurantId: restaurantId as Id<'restaurants'>,
      customerName: customer_name,
      date,
      customerPhone: customer_phone,
    });

    if (!results || results.length === 0) {
      return NextResponse.json({
        success: true,
        message: `I couldn't find any reservations matching your criteria. Please double-check the name, date, or phone number and try again.`,
        reservations: [],
        count: 0,
      });
    }

    // Format results for the agent
    const formattedReservations = results.map((r) => ({
      reservation_id: r.reservationId,
      customer_name: r.customerName,
      date: r.date,
      time: r.time,
      party_size: r.partySize,
      customer_phone: r.customerPhone,
      special_requests: r.specialRequests,
      status: r.status,
    }));

    // Create a natural language response
    let message = '';
    if (results.length === 1) {
      const r = results[0];
      const [hours, minutes] = r.time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      const formattedTime = `${displayHour}:${minutes} ${ampm}`;

      message = `I found your reservation! It's under ${r.customerName} on ${r.date} at ${formattedTime} for ${r.partySize} ${r.partySize === 1 ? 'guest' : 'guests'}. The reservation ID is ${r.reservationId}. ${r.status === 'cancelled' ? 'Note: This reservation is currently cancelled. ' : ''}How would you like to proceed?`;
    } else {
      message = `I found ${results.length} reservations matching your search:\n\n`;
      results.forEach((r, index) => {
        const [hours, minutes] = r.time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const formattedTime = `${displayHour}:${minutes} ${ampm}`;

        message += `${index + 1}. ${r.customerName} - ${r.date} at ${formattedTime} for ${r.partySize} ${r.partySize === 1 ? 'guest' : 'guests'} (ID: ${r.reservationId})${r.status === 'cancelled' ? ' [CANCELLED]' : ''}\n`;
      });
      message += `\nWhich reservation would you like to modify or cancel?`;
    }

    return NextResponse.json({
      success: true,
      message,
      reservations: formattedReservations,
      count: results.length,
    });
  } catch (error) {
    console.error('Error searching reservations:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, I encountered an error while searching for reservations. Please try again.',
      },
      { status: 500 }
    );
  }
}
