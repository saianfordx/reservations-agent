import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { auth } from '@clerk/nextjs/server';
import { isOrgAdmin } from './permissions';

// Get all restaurants for the current user or organization
export const getMyRestaurants = query({
  args: {
    clerkOrganizationId: v.optional(v.string()),
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

    // If organization context is provided, query by organization
    if (args.clerkOrganizationId) {
      const clerkOrgId = args.clerkOrganizationId;
      // Find the organization in Convex
      const organization = await ctx.db
        .query('organizations')
        .withIndex('by_clerk_organization_id', (q) =>
          q.eq('clerkOrganizationId', clerkOrgId)
        )
        .first();

      if (!organization) {
        // Organization not synced yet, return empty array
        return [];
      }

      // Verify user is a member of this organization
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_clerk_org_and_user', (q) =>
          q.eq('clerkOrganizationId', clerkOrgId).eq('clerkUserId', identity.subject)
        )
        .first();

      if (!membership) {
        throw new Error('Not a member of this organization');
      }

      // Check if user is organization admin
      const isAdmin = isOrgAdmin(membership.role);

      if (isAdmin) {
        // Org admins see ALL restaurants in the organization
        const restaurants = await ctx.db
          .query('restaurants')
          .withIndex('by_organization', (q) => q.eq('organizationId', organization._id))
          .order('desc')
          .collect();

        return restaurants;
      } else {
        // Regular members only see restaurants they have explicit access to
        const accessRecords = await ctx.db
          .query('restaurantAccess')
          .withIndex('by_user_and_organization', (q) =>
            q.eq('userId', user._id).eq('organizationId', organization._id)
          )
          .collect();

        // Get the restaurants from access records
        const restaurants = await Promise.all(
          accessRecords.map(async (access) => {
            const restaurant = await ctx.db.get(access.restaurantId);
            return restaurant;
          })
        );

        // Filter out any null results and sort by creation date (newest first)
        return restaurants
          .filter((r) => r !== null)
          .sort((a, b) => b!.createdAt - a!.createdAt) as any[];
      }
    }

    // Personal account context - query by owner
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

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Verify access - either organization member or personal owner
    if (restaurant.organizationId) {
      const orgId = restaurant.organizationId;
      // Check organization membership
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_organization_and_user', (q) =>
          q.eq('organizationId', orgId).eq('userId', user._id)
        )
        .first();

      if (!membership) {
        throw new Error('Unauthorized');
      }
    } else if (restaurant.ownerId) {
      // Check personal ownership
      if (restaurant.ownerId !== user._id) {
        throw new Error('Unauthorized');
      }
    } else {
      throw new Error('Restaurant has no owner or organization');
    }

    return restaurant;
  },
});

// Create a new restaurant
export const createRestaurant = mutation({
  args: {
    clerkOrganizationId: v.optional(v.string()),
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

    let organizationId: any = undefined;
    let ownerId: any = undefined;

    // If organization context is provided, create restaurant for organization
    if (args.clerkOrganizationId) {
      const clerkOrgId = args.clerkOrganizationId;
      // Find the organization in Convex
      const organization = await ctx.db
        .query('organizations')
        .withIndex('by_clerk_organization_id', (q) =>
          q.eq('clerkOrganizationId', clerkOrgId)
        )
        .first();

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Verify user is a member with appropriate permissions
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_clerk_org_and_user', (q) =>
          q.eq('clerkOrganizationId', clerkOrgId).eq('clerkUserId', identity.subject)
        )
        .first();

      if (!membership) {
        throw new Error('Not a member of this organization');
      }

      // Check if user has permission to create restaurants (admins can)
      if (membership.role !== 'org:admin' && !membership.permissions.includes('org:restaurant:create')) {
        throw new Error('Insufficient permissions to create restaurant');
      }

      organizationId = organization._id;
    } else {
      // Personal account context
      ownerId = user._id;
    }

    const restaurantId = await ctx.db.insert('restaurants', {
      organizationId,
      ownerId,
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

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Verify access - either organization member with permissions or personal owner
    if (restaurant.organizationId) {
      const orgId = restaurant.organizationId;
      // Check organization membership
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_organization_and_user', (q) =>
          q.eq('organizationId', orgId).eq('userId', user._id)
        )
        .first();

      if (!membership) {
        throw new Error('Unauthorized');
      }

      // Check permissions
      if (membership.role !== 'org:admin' && !membership.permissions.includes('org:restaurant:update')) {
        throw new Error('Insufficient permissions to update restaurant');
      }
    } else if (restaurant.ownerId) {
      // Check personal ownership
      if (restaurant.ownerId !== user._id) {
        throw new Error('Unauthorized');
      }
    } else {
      throw new Error('Restaurant has no owner or organization');
    }

    const { id, ...updates } = args;

    await ctx.db.patch(args.id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Get restaurant info without auth (for public webhooks)
export const getRestaurantPublic = query({
  args: { id: v.id('restaurants') },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.id);
    return restaurant;
  },
});

// Delete a restaurant with cascade (deletes agents, reservations, etc.)
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

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Verify access - either organization member with permissions or personal owner
    if (restaurant.organizationId) {
      const orgId = restaurant.organizationId;
      // Check organization membership
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_organization_and_user', (q) =>
          q.eq('organizationId', orgId).eq('userId', user._id)
        )
        .first();

      if (!membership) {
        throw new Error('Unauthorized');
      }

      // Check permissions
      if (membership.role !== 'org:admin' && !membership.permissions.includes('org:restaurant:delete')) {
        throw new Error('Insufficient permissions to delete restaurant');
      }
    } else if (restaurant.ownerId) {
      // Check personal ownership
      if (restaurant.ownerId !== user._id) {
        throw new Error('Unauthorized');
      }
    } else {
      throw new Error('Restaurant has no owner or organization');
    }

    // CASCADE DELETE: Delete all related data

    // 1. Delete all agents for this restaurant
    const agents = await ctx.db
      .query('agents')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.id))
      .collect();

    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    // 2. Delete all reservations for this restaurant
    const reservations = await ctx.db
      .query('reservations')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.id))
      .collect();

    for (const reservation of reservations) {
      await ctx.db.delete(reservation._id);
    }

    // 3. Finally, delete the restaurant itself
    await ctx.db.delete(args.id);

    return args.id;
  },
});
