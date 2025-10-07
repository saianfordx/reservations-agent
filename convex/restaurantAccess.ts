import { v } from 'convex/values';
import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import {
  RestaurantRole,
  OrgRole,
  getPermissionsForRole,
  isOrgAdmin
} from './permissions';

// ============================================
// QUERIES
// ============================================

/**
 * Get all users with access to a specific restaurant
 */
export const getRestaurantMembers = query({
  args: {
    restaurantId: v.id('restaurants'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get restaurant
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant || !restaurant.organizationId) {
      throw new Error('Restaurant not found');
    }

    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has permission to view members
    const canManage = await canManageRestaurantAccess(ctx, user._id, restaurant.organizationId, args.restaurantId);
    if (!canManage) {
      throw new Error('You do not have permission to view restaurant members');
    }

    // Get all access records for this restaurant
    const accessRecords = await ctx.db
      .query('restaurantAccess')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();

    // Enrich with user data
    const members = await Promise.all(
      accessRecords.map(async (access) => {
        const member = await ctx.db.get(access.userId);
        const grantedByUser = access.grantedBy ? await ctx.db.get(access.grantedBy) : null;

        return {
          ...access,
          user: member,
          grantedByUser,
        };
      })
    );

    return members;
  },
});

/**
 * Get user's access to a specific restaurant
 */
export const getUserRestaurantAccess = query({
  args: {
    restaurantId: v.id('restaurants'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Check restaurant access
    const access = await ctx.db
      .query('restaurantAccess')
      .withIndex('by_restaurant_and_user', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('userId', user._id)
      )
      .first();

    if (access) {
      return access;
    }

    // If no direct access, check if user is org admin
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant || !restaurant.organizationId) {
      return null;
    }

    const organizationId = restaurant.organizationId; // Extract to help TypeScript

    const orgMembership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', organizationId).eq('userId', user._id)
      )
      .first();

    if (orgMembership && isOrgAdmin(orgMembership.role)) {
      // Org admins have implicit owner access
      return {
        restaurantId: args.restaurantId,
        userId: user._id,
        organizationId,
        role: RestaurantRole.OWNER,
        permissions: getPermissionsForRole(RestaurantRole.OWNER),
        isImplicit: true, // Flag to indicate this is implicit access
      };
    }

    return null;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Grant access to a user for a specific restaurant
 */
export const grantRestaurantAccess = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    userId: v.id('users'),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get current user
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Get restaurant
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant || !restaurant.organizationId) {
      throw new Error('Restaurant not found');
    }

    // Check if current user can manage access
    const canManage = await canManageRestaurantAccess(
      ctx,
      currentUser._id,
      restaurant.organizationId,
      args.restaurantId
    );

    if (!canManage) {
      throw new Error('You do not have permission to grant access to this restaurant');
    }

    // Validate role
    const validRoles = Object.values(RestaurantRole);
    if (!validRoles.includes(args.role as any)) {
      throw new Error('Invalid role');
    }

    // Check if access already exists
    const existingAccess = await ctx.db
      .query('restaurantAccess')
      .withIndex('by_restaurant_and_user', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('userId', args.userId)
      )
      .first();

    const permissions = getPermissionsForRole(args.role);

    if (existingAccess) {
      // Update existing access
      await ctx.db.patch(existingAccess._id, {
        role: args.role,
        permissions,
        updatedAt: Date.now(),
      });
      return existingAccess._id;
    }

    // Create new access
    const accessId = await ctx.db.insert('restaurantAccess', {
      restaurantId: args.restaurantId,
      userId: args.userId,
      organizationId: restaurant.organizationId,
      role: args.role,
      permissions,
      grantedBy: currentUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return accessId;
  },
});

/**
 * Revoke access to a restaurant for a user
 */
export const revokeRestaurantAccess = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get current user
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Get restaurant
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant || !restaurant.organizationId) {
      throw new Error('Restaurant not found');
    }

    // Check if current user can manage access
    const canManage = await canManageRestaurantAccess(
      ctx,
      currentUser._id,
      restaurant.organizationId,
      args.restaurantId
    );

    if (!canManage) {
      throw new Error('You do not have permission to revoke access to this restaurant');
    }

    // Find and delete access
    const access = await ctx.db
      .query('restaurantAccess')
      .withIndex('by_restaurant_and_user', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('userId', args.userId)
      )
      .first();

    if (!access) {
      throw new Error('Access not found');
    }

    await ctx.db.delete(access._id);
    return true;
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a user can manage access for a restaurant
 */
async function canManageRestaurantAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>,
  restaurantId: Id<'restaurants'>
): Promise<boolean> {
  // Check if user is org admin
  const orgMembership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_and_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', userId)
    )
    .first();

  if (orgMembership && isOrgAdmin(orgMembership.role)) {
    return true;
  }

  // Check if user has restaurant owner/manager role
  const restaurantAccess = await ctx.db
    .query('restaurantAccess')
    .withIndex('by_restaurant_and_user', (q) =>
      q.eq('restaurantId', restaurantId).eq('userId', userId)
    )
    .first();

  if (!restaurantAccess) {
    return false;
  }

  // Owner and Manager can manage access
  const role = restaurantAccess.role;
  return role === RestaurantRole.OWNER || role === RestaurantRole.MANAGER;
}
