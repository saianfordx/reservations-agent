import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Generate a unique 4-digit reservation ID
 */
async function generateReservationId(
  ctx: any,
  restaurantId: string
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Generate random 4-digit number
    const id = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if it exists for this restaurant
    const existing = await ctx.db
      .query('reservations')
      .withIndex('by_reservation_id', (q: any) =>
        q.eq('restaurantId', restaurantId).eq('reservationId', id)
      )
      .first();

    if (!existing) {
      return id;
    }

    attempts++;
  }

  throw new Error('Could not generate unique reservation ID');
}

/**
 * Create a new reservation
 */
export const create = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    agentId: v.id('agents'),
    customerName: v.string(),
    date: v.string(),
    time: v.string(),
    partySize: v.number(),
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    callId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate unique reservation ID
    const reservationId = await generateReservationId(ctx, args.restaurantId);

    const now = Date.now();

    // Create reservation
    const id = await ctx.db.insert('reservations', {
      restaurantId: args.restaurantId,
      agentId: args.agentId,
      reservationId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      date: args.date,
      time: args.time,
      partySize: args.partySize,
      specialRequests: args.specialRequests,
      status: 'confirmed',
      source: 'phone_agent',
      callId: args.callId,
      history: [
        {
          action: 'created',
          timestamp: now,
          modifiedBy: 'phone_agent',
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      reservationId,
    };
  },
});

/**
 * Update an existing reservation
 */
export const update = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    reservationId: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    partySize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find reservation
    const reservation = await ctx.db
      .query('reservations')
      .withIndex('by_reservation_id', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('reservationId', args.reservationId)
      )
      .first();

    if (!reservation) {
      throw new Error(`Reservation ${args.reservationId} not found`);
    }

    if (reservation.status === 'cancelled') {
      throw new Error('Cannot modify a cancelled reservation');
    }

    const now = Date.now();
    const changes: Record<string, any> = {};

    // Build update object and track changes
    const updates: any = {
      updatedAt: now,
    };

    if (args.date !== undefined) {
      changes.date = { from: reservation.date, to: args.date };
      updates.date = args.date;
    }

    if (args.time !== undefined) {
      changes.time = { from: reservation.time, to: args.time };
      updates.time = args.time;
    }

    if (args.partySize !== undefined) {
      changes.partySize = { from: reservation.partySize, to: args.partySize };
      updates.partySize = args.partySize;
    }

    // Update history
    updates.history = [
      ...reservation.history,
      {
        action: 'updated',
        timestamp: now,
        changes,
        modifiedBy: 'phone_agent',
      },
    ];

    await ctx.db.patch(reservation._id, updates);

    return {
      success: true,
      reservationId: args.reservationId,
    };
  },
});

/**
 * Cancel a reservation
 */
export const cancel = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    reservationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find reservation
    const reservation = await ctx.db
      .query('reservations')
      .withIndex('by_reservation_id', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('reservationId', args.reservationId)
      )
      .first();

    if (!reservation) {
      throw new Error(`Reservation ${args.reservationId} not found`);
    }

    if (reservation.status === 'cancelled') {
      throw new Error('Reservation is already cancelled');
    }

    const now = Date.now();

    await ctx.db.patch(reservation._id, {
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
      history: [
        ...reservation.history,
        {
          action: 'cancelled',
          timestamp: now,
          modifiedBy: 'phone_agent',
        },
      ],
    });

    return {
      success: true,
      reservationId: args.reservationId,
    };
  },
});

/**
 * Get all reservations for a restaurant
 */
export const listByRestaurant = query({
  args: {
    restaurantId: v.id('restaurants'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let reservations;

    if (args.status) {
      reservations = await ctx.db
        .query('reservations')
        .withIndex('by_restaurant_status', (q) =>
          q.eq('restaurantId', args.restaurantId).eq('status', args.status)
        )
        .collect();
    } else {
      reservations = await ctx.db
        .query('reservations')
        .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
        .collect();
    }

    return reservations.sort((a, b) => {
      // Sort by date, then time
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  },
});

/**
 * Get reservations by date range
 */
export const listByDateRange = query({
  args: {
    restaurantId: v.id('restaurants'),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const reservations = await ctx.db
      .query('reservations')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();

    return reservations
      .filter((r) => r.date >= args.startDate && r.date <= args.endDate)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
  },
});

/**
 * Get a single reservation by ID
 */
export const getByReservationId = query({
  args: {
    restaurantId: v.id('restaurants'),
    reservationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('reservations')
      .withIndex('by_reservation_id', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('reservationId', args.reservationId)
      )
      .first();
  },
});
