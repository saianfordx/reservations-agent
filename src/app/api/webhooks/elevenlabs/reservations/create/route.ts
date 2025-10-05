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
    if (!customer_name || !date || !time || !party_size) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required information. Please provide customer name, date, time, and party size.',
        },
        { status: 400 }
      );
    }

    // Create reservation in Convex
    const convex = getConvexClient();
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
      message: `Reservation confirmed for ${customer_name} on ${date} at ${time} for ${party_size} guests. Your reservation ID is ${result.reservationId}. Please save this ID for future reference.`,
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
