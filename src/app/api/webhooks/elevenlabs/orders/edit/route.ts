import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to edit orders
 */
export async function POST(req: NextRequest) {
  let order_id: string | undefined;
  try {
    const body = await req.json();
    order_id = body.order_id;
    const { items, order_notes, pickup_time, pickup_date } = body;

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
          message: 'Please provide the order ID for the order you want to modify.',
        },
        { status: 400 }
      );
    }

    console.log('Editing order:', body);

    // Get restaurant for timezone validation if pickup_date is being updated
    const convex = getConvexClient();
    if (pickup_date !== undefined) {
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

      // Validate that the new pickup date is not in the past
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
      const orderDate = new Date(pickup_date + 'T00:00:00');
      const todayDate = new Date(todayFormatted + 'T00:00:00');

      if (orderDate < todayDate) {
        return NextResponse.json(
          {
            success: false,
            message: `I'm sorry, but that date (${pickup_date}) is in the past. Please provide a date that is today (${todayFormatted}) or later.`,
          },
          { status: 400 }
        );
      }
    }

    // Transform items to match Convex schema (special_instructions -> specialInstructions) if items are provided
    const transformedItems = items ? items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      specialInstructions: item.special_instructions || item.specialInstructions,
    })) : undefined;

    // Update order in Convex
    const result = await convex.mutation(api.orders.update, {
      restaurantId: restaurantId as Id<'restaurants'>,
      orderId: order_id,
      items: transformedItems,
      orderNotes: order_notes,
      pickupTime: pickup_time,
      pickupDate: pickup_date,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Could not update the order. Please check the order ID and try again.',
        },
        { status: 400 }
      );
    }

    // Build confirmation message
    const changes: string[] = [];
    if (items !== undefined) changes.push('items');
    if (order_notes !== undefined) changes.push('order notes');
    if (pickup_time !== undefined) changes.push('pickup time');
    if (pickup_date !== undefined) changes.push('pickup date');

    const changesText = changes.length > 0 ? changes.join(', ') : 'no changes';

    return NextResponse.json({
      success: true,
      message: `Your order ${order_id} has been successfully updated. Changes: ${changesText}.`,
      order_id,
      items,
      order_notes,
      pickup_time,
      pickup_date,
    });
  } catch (error: unknown) {
    console.error('Error editing order:', error);
    const errorMessage = error instanceof Error ? error.message : '';

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          message: `I could not find order ${order_id}. Please double-check the order ID.`,
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('cancelled')) {
      return NextResponse.json(
        {
          success: false,
          message: `Order ${order_id} has been cancelled and cannot be modified.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, I encountered an error while updating your order. Please try again.',
      },
      { status: 500 }
    );
  }
}
