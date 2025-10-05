import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to cancel reservations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservation_id } = body;

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

    console.log('Cancelling reservation:', body);

    if (!reservation_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide your reservation ID to cancel.',
        },
        { status: 400 }
      );
    }

    // Cancel reservation in Convex
    const convex = getConvexClient();
    await convex.mutation(api.reservations.cancel, {
      restaurantId: restaurantId as Id<'restaurants'>,
      reservationId: reservation_id,
    });

    return NextResponse.json({
      success: true,
      message: `Reservation ${reservation_id} has been successfully cancelled. We hope to see you again soon!`,
      reservation_id,
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        message:
          errorMessage.includes('not found')
            ? 'Reservation was not found. Please check your reservation ID and try again.'
            : 'Sorry, I encountered an error while cancelling your reservation. Please try again.',
      },
      { status: 500 }
    );
  }
}
