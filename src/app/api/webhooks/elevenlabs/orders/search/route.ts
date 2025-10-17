import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to search for orders
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, pickup_date, customer_phone } = body;

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

    console.log('Searching for orders:', body);

    // At least one search criteria must be provided
    if (!customer_name && !pickup_date && !customer_phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide at least one search criteria: customer name, pickup date, or phone number.',
        },
        { status: 400 }
      );
    }

    // Search for orders in Convex
    const convex = getConvexClient();
    const orders = await convex.query(api.orders.searchOrders, {
      restaurantId: restaurantId as Id<'restaurants'>,
      customerName: customer_name,
      pickupDate: pickup_date,
      customerPhone: customer_phone,
    });

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          'I could not find any orders matching your search criteria. Please double-check the information and try again.',
        orders: [],
      });
    }

    // Format orders for response
    const formattedOrders = orders.map((order: any) => {
      const itemsList = order.items.map((item: any) => `${item.quantity} ${item.name}`).join(', ');
      const pickupInfo = order.pickupTime
        ? `${order.pickupTime}${order.pickupDate ? ` on ${order.pickupDate}` : ''}`
        : order.pickupDate || 'ASAP';

      return {
        order_id: order.orderId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        items: order.items,
        pickup_info: pickupInfo,
        status: order.status,
        notes: order.orderNotes,
      };
    });

    // Build message
    let message = '';
    if (formattedOrders.length === 1) {
      const order = formattedOrders[0];
      const itemsList = order.items.map((item: any) => `${item.quantity} ${item.name}`).join(', ');
      message = `I found your order. Order ID ${order.order_id} for ${order.customer_name} (${order.customer_phone}). Items: ${itemsList}. Pickup: ${order.pickup_info}. Status: ${order.status}.`;
      if (order.status === 'cancelled') {
        message += ' This order has been cancelled.';
      }
    } else {
      message = `I found ${formattedOrders.length} orders matching your search. `;
      formattedOrders.forEach((order: any, index: number) => {
        const itemsList = order.items.map((item: any) => `${item.quantity} ${item.name}`).join(', ');
        message += `Order ${index + 1}: ID ${order.order_id} for ${order.customer_name}. Items: ${itemsList}. Pickup: ${order.pickup_info}. `;
      });
    }

    return NextResponse.json({
      success: true,
      message,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('Error searching for orders:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, I encountered an error while searching for your order. Please try again.',
      },
      { status: 500 }
    );
  }
}
