import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

type OrderItem = {
  name: string;
  quantity: number;
  specialInstructions?: string;
};

/**
 * Webhook endpoint for ElevenLabs agent to create to-go orders
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_name,
      customer_phone,
      items,
      order_notes,
      pickup_time,
      pickup_date,
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

    console.log('Creating order:', body);

    // Validate inputs
    if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required information. Please provide customer name, phone number, and at least one item to order.',
        },
        { status: 400 }
      );
    }

    // Get restaurant
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

    // If pickup_date is provided, validate it's not in the past
    if (pickup_date) {
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

    // Create order in Convex
    const result = await convex.mutation(api.orders.create, {
      restaurantId: restaurantId as Id<'restaurants'>,
      agentId: agentId as Id<'agents'>,
      customerName: customer_name,
      customerPhone: customer_phone,
      items,
      orderNotes: order_notes,
      pickupTime: pickup_time,
      pickupDate: pickup_date,
    });

    // Build confirmation message
    const itemsList = (items as OrderItem[]).map((item) => `${item.quantity} ${item.name}`).join(', ');
    const pickupInfo = pickup_time
      ? `at ${pickup_time}${pickup_date ? ` on ${pickup_date}` : ''}`
      : pickup_date
        ? `on ${pickup_date}`
        : 'as soon as possible';

    return NextResponse.json({
      success: true,
      message: `Perfect! Your to-go order is confirmed for ${customer_name}. You ordered: ${itemsList}. Your order will be ready for pickup ${pickupInfo}. Your callback number is ${customer_phone}. Your order ID is ${result.orderId}. To make any changes or cancel this order, simply call us with your phone number ${customer_phone}.`,
      order_id: result.orderId,
      customer_name,
      customer_phone,
      items,
      order_notes,
      pickup_time,
      pickup_date,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, I encountered an error while creating your order. Please try again.',
      },
      { status: 500 }
    );
  }
}
