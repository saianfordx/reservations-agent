import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to cancel orders
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id } = body;

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

    if (!order_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide the order ID for the order you want to cancel.',
        },
        { status: 400 }
      );
    }

    console.log('Cancelling order:', order_id);

    // Cancel order in Convex
    const convex = getConvexClient();
    const result = await convex.mutation(api.orders.cancel, {
      restaurantId: restaurantId as Id<'restaurants'>,
      orderId: order_id,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Could not cancel the order. Please check the order ID and try again.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Your order ${order_id} has been successfully cancelled. If you have any questions, please feel free to call us.`,
      order_id,
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          message: `I could not find order ${body.order_id}. Please double-check the order ID.`,
        },
        { status: 404 }
      );
    }

    if (error.message?.includes('already cancelled')) {
      return NextResponse.json(
        {
          success: false,
          message: `Order ${body.order_id} has already been cancelled.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, I encountered an error while cancelling your order. Please try again.',
      },
      { status: 500 }
    );
  }
}
