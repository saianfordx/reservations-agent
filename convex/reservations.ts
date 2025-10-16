import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';

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

    // Get restaurant details for email notification
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

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

    // Get admin emails
    const adminEmails: string[] = [];

    if (restaurant.organizationId) {
      // Get the organization owner
      const organization = await ctx.db.get(restaurant.organizationId);
      if (organization) {
        const orgOwner = await ctx.db.get(organization.createdBy);
        if (orgOwner?.email) {
          adminEmails.push(orgOwner.email);
        }
      }

      // Get restaurant managers only
      const restaurantAccess = await ctx.db
        .query('restaurantAccess')
        .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
        .collect();

      const restaurantManagers = restaurantAccess.filter(
        (access) => access.role === 'restaurant:manager'
      );

      for (const access of restaurantManagers) {
        const user = await ctx.db.get(access.userId);
        if (user?.email && !adminEmails.includes(user.email)) {
          adminEmails.push(user.email);
        }
      }
    } else if (restaurant.ownerId) {
      // Personal account - get owner email
      const owner = await ctx.db.get(restaurant.ownerId);
      if (owner?.email) {
        adminEmails.push(owner.email);
      }
    }

    // Add notification emails from restaurant settings
    if (restaurant.settings.notificationEmails) {
      console.log('Found notification emails in settings:', restaurant.settings.notificationEmails);
      for (const email of restaurant.settings.notificationEmails) {
        console.log(email);
        if (email && !adminEmails.includes(email)) {
          adminEmails.push(email);
        }
      }
    }

    console.log('Final adminEmails array being sent:', adminEmails);

    // Send email notification to restaurant admins
    // @ts-ignore - Type instantiation depth issue with Convex internal types
    ctx.scheduler.runAfter(0, internal.notifications.sendReservationNotification, {
      reservationId: id,
      restaurantId: args.restaurantId,
      reservationData: {
        reservationId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        date: args.date,
        time: args.time,
        partySize: args.partySize,
        specialRequests: args.specialRequests,
        source: 'phone_agent',
      },
      restaurantData: {
        name: restaurant.name,
        address: restaurant.location.address,
        city: restaurant.location.city,
        state: restaurant.location.state,
        contactEmail: restaurant.contact.email,
      },
      adminEmails,
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
      const status = args.status;
      reservations = await ctx.db
        .query('reservations')
        .withIndex('by_restaurant_status', (q) =>
          q.eq('restaurantId', args.restaurantId).eq('status', status)
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

/**
 * Create a new reservation manually (from dashboard)
 */
export const createManual = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    customerName: v.string(),
    date: v.string(),
    time: v.string(),
    partySize: v.number(),
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Generate unique reservation ID
    const reservationId = await generateReservationId(ctx, args.restaurantId);

    const now = Date.now();

    // Get restaurant details for email notification
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Create reservation
    const id = await ctx.db.insert('reservations', {
      restaurantId: args.restaurantId,
      reservationId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      date: args.date,
      time: args.time,
      partySize: args.partySize,
      specialRequests: args.specialRequests,
      status: 'confirmed',
      source: 'manual',
      history: [
        {
          action: 'created',
          timestamp: now,
          modifiedBy: identity.email || 'manual',
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Get admin emails
    const adminEmails: string[] = [];

    if (restaurant.organizationId) {
      // Get the organization owner
      const organization = await ctx.db.get(restaurant.organizationId);
      if (organization) {
        const orgOwner = await ctx.db.get(organization.createdBy);
        if (orgOwner?.email) {
          adminEmails.push(orgOwner.email);
        }
      }

      // Get restaurant managers only
      const restaurantAccess = await ctx.db
        .query('restaurantAccess')
        .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
        .collect();

      const restaurantManagers = restaurantAccess.filter(
        (access) => access.role === 'restaurant:manager'
      );

      for (const access of restaurantManagers) {
        const user = await ctx.db.get(access.userId);
        if (user?.email && !adminEmails.includes(user.email)) {
          adminEmails.push(user.email);
        }
      }
    } else if (restaurant.ownerId) {
      // Personal account - get owner email
      const owner = await ctx.db.get(restaurant.ownerId);
      if (owner?.email) {
        adminEmails.push(owner.email);
      }
    }

    // Add notification emails from restaurant settings
    if (restaurant.settings.notificationEmails) {
      console.log('Found notification emails in settings:', restaurant.settings.notificationEmails);
      for (const email of restaurant.settings.notificationEmails) {
        if (email && !adminEmails.includes(email)) {
          adminEmails.push(email);
        }
      }
    }

    console.log('Final adminEmails array being sent:', adminEmails);

    // Send email notification to restaurant admins
    // @ts-ignore - Type instantiation depth issue with Convex internal types
    ctx.scheduler.runAfter(0, internal.notifications.sendReservationNotification, {
      reservationId: id,
      restaurantId: args.restaurantId,
      reservationData: {
        reservationId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        date: args.date,
        time: args.time,
        partySize: args.partySize,
        specialRequests: args.specialRequests,
        source: 'manual',
      },
      restaurantData: {
        name: restaurant.name,
        address: restaurant.location.address,
        city: restaurant.location.city,
        state: restaurant.location.state,
        contactEmail: restaurant.contact.email,
      },
      adminEmails,
    });

    return {
      id,
      reservationId,
    };
  },
});

/**
 * Update an existing reservation manually (from dashboard)
 */
export const updateManual = mutation({
  args: {
    id: v.id('reservations'),
    customerName: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    partySize: v.optional(v.number()),
    customerPhone: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Find reservation
    const reservation = await ctx.db.get(args.id);

    if (!reservation) {
      throw new Error('Reservation not found');
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

    if (args.customerName !== undefined) {
      changes.customerName = { from: reservation.customerName, to: args.customerName };
      updates.customerName = args.customerName;
    }

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

    if (args.customerPhone !== undefined) {
      changes.customerPhone = { from: reservation.customerPhone, to: args.customerPhone };
      updates.customerPhone = args.customerPhone;
    }

    if (args.specialRequests !== undefined) {
      changes.specialRequests = { from: reservation.specialRequests, to: args.specialRequests };
      updates.specialRequests = args.specialRequests;
    }

    // Update history
    updates.history = [
      ...reservation.history,
      {
        action: 'updated',
        timestamp: now,
        changes,
        modifiedBy: identity.email || 'manual',
      },
    ];

    await ctx.db.patch(reservation._id, updates);

    return {
      success: true,
      reservationId: reservation.reservationId,
    };
  },
});

/**
 * Delete a reservation permanently (from dashboard)
 */
export const deleteReservation = mutation({
  args: {
    id: v.id('reservations'),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Delete the reservation
    await ctx.db.delete(args.id);

    return {
      success: true,
    };
  },
});

/**
 * Search for reservations by name, date, and/or phone (for agent use)
 */
export const searchReservations = query({
  args: {
    restaurantId: v.id('restaurants'),
    customerName: v.optional(v.string()),
    date: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all reservations for the restaurant
    const allReservations = await ctx.db
      .query('reservations')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();

    // Filter based on search criteria
    let results = allReservations;

    // Filter by customer name (case-insensitive partial match)
    if (args.customerName) {
      const searchName = args.customerName.toLowerCase().trim();
      results = results.filter((r) =>
        r.customerName.toLowerCase().includes(searchName)
      );
    }

    // Filter by date (exact match)
    if (args.date) {
      results = results.filter((r) => r.date === args.date);
    }

    // Filter by phone (partial match)
    if (args.customerPhone) {
      const searchPhone = args.customerPhone.replace(/\D/g, ''); // Remove non-digits
      results = results.filter((r) => {
        if (!r.customerPhone) return false;
        const normalizedPhone = r.customerPhone.replace(/\D/g, '');
        return normalizedPhone.includes(searchPhone);
      });
    }

    // Sort by date and time (most recent first)
    results.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });

    // Limit to 10 results to avoid overwhelming the agent
    return results.slice(0, 10);
  },
});

/**
 * Get a single reservation by its internal ID (for notifications)
 */
export const getById = query({
  args: {
    id: v.id('reservations'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
