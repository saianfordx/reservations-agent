import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { auth } from '@clerk/nextjs/server';

// Get all restaurants for the current user
export const getMyRestaurants = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    const restaurants = await ctx.db
      .query('restaurants')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .order('desc')
      .collect();

    return restaurants;
  },
});

// Get a single restaurant by ID
export const getRestaurant = query({
  args: { id: v.id('restaurants') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const restaurant = await ctx.db.get(args.id);

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Verify ownership
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user || restaurant.ownerId !== user._id) {
      throw new Error('Unauthorized');
    }

    return restaurant;
  },
});

// Create a new restaurant
export const createRestaurant = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    cuisine: v.optional(v.string()),
    location: v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      country: v.string(),
      zipCode: v.string(),
      timezone: v.string(),
    }),
    contact: v.object({
      email: v.string(),
      phone: v.string(),
      website: v.optional(v.string()),
    }),
    operatingHours: v.object({
      monday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      tuesday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      wednesday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      thursday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      friday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      saturday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      sunday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
    }),
    settings: v.object({
      seatingCapacity: v.number(),
      avgTableTurnoverMinutes: v.number(),
      reservationBuffer: v.number(),
      maxPartySize: v.number(),
      minPartySize: v.number(),
      advanceBookingDays: v.number(),
      cancellationPolicy: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    const now = Date.now();

    const restaurantId = await ctx.db.insert('restaurants', {
      ownerId: user._id,
      name: args.name,
      description: args.description,
      cuisine: args.cuisine,
      location: args.location,
      contact: args.contact,
      operatingHours: args.operatingHours,
      settings: args.settings,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return restaurantId;
  },
});

// Update a restaurant
export const updateRestaurant = mutation({
  args: {
    id: v.id('restaurants'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    cuisine: v.optional(v.string()),
    location: v.optional(
      v.object({
        address: v.string(),
        city: v.string(),
        state: v.string(),
        country: v.string(),
        zipCode: v.string(),
        timezone: v.string(),
      })
    ),
    contact: v.optional(
      v.object({
        email: v.string(),
        phone: v.string(),
        website: v.optional(v.string()),
      })
    ),
    operatingHours: v.optional(
      v.object({
        monday: v.object({
          isOpen: v.boolean(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
        }),
        tuesday: v.object({
          isOpen: v.boolean(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
        }),
        wednesday: v.object({
          isOpen: v.boolean(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
        }),
        thursday: v.object({
          isOpen: v.boolean(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
        }),
        friday: v.object({
          isOpen: v.boolean(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
        }),
        saturday: v.object({
          isOpen: v.boolean(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
        }),
        sunday: v.object({
          isOpen: v.boolean(),
          open: v.optional(v.string()),
          close: v.optional(v.string()),
        }),
      })
    ),
    settings: v.optional(
      v.object({
        seatingCapacity: v.number(),
        avgTableTurnoverMinutes: v.number(),
        reservationBuffer: v.number(),
        maxPartySize: v.number(),
        minPartySize: v.number(),
        advanceBookingDays: v.number(),
        cancellationPolicy: v.optional(v.string()),
      })
    ),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const restaurant = await ctx.db.get(args.id);

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Verify ownership
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user || restaurant.ownerId !== user._id) {
      throw new Error('Unauthorized');
    }

    const { id, ...updates } = args;

    await ctx.db.patch(args.id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Delete a restaurant
export const deleteRestaurant = mutation({
  args: { id: v.id('restaurants') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const restaurant = await ctx.db.get(args.id);

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Verify ownership
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user || restaurant.ownerId !== user._id) {
      throw new Error('Unauthorized');
    }

    // Archive instead of delete
    await ctx.db.patch(args.id, {
      status: 'archived',
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
