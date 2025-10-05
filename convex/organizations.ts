import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ============================================
// QUERIES
// ============================================

/**
 * Get or create organization from Clerk data
 */
export const syncOrganization = mutation({
  args: {
    clerkOrganizationId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get or create user first
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      throw new Error('User not found. Please sync user first.');
    }

    // Check if organization already exists
    const existingOrg = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (existingOrg) {
      // Update organization
      await ctx.db.patch(existingOrg._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        updatedAt: Date.now(),
      });
      return existingOrg._id;
    }

    // Create new organization
    const orgId = await ctx.db.insert('organizations', {
      clerkOrganizationId: args.clerkOrganizationId,
      name: args.name,
      slug: args.slug,
      imageUrl: args.imageUrl,
      createdBy: user._id,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return orgId;
  },
});

/**
 * Sync organization membership from Clerk
 */
export const syncOrganizationMembership = mutation({
  args: {
    clerkOrganizationId: v.string(),
    clerkUserId: v.string(),
    role: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Get organization
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if membership already exists
    const existingMembership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', org._id).eq('userId', user._id)
      )
      .first();

    if (existingMembership) {
      // Update role and permissions
      await ctx.db.patch(existingMembership._id, {
        role: args.role,
        permissions: args.permissions,
        updatedAt: Date.now(),
      });
      return existingMembership._id;
    }

    // Create new membership
    const membershipId = await ctx.db.insert('organizationMemberships', {
      organizationId: org._id,
      userId: user._id,
      clerkOrganizationId: args.clerkOrganizationId,
      clerkUserId: args.clerkUserId,
      role: args.role,
      permissions: args.permissions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return membershipId;
  },
});

/**
 * Get user's organizations
 */
export const getUserOrganizations = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    // Get user's memberships
    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Get organizations
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        return {
          ...org!,
          role: membership.role,
          membershipId: membership._id,
        };
      })
    );

    return organizations;
  },
});

/**
 * Get organization by Clerk ID
 */
export const getOrganizationByClerkId = query({
  args: {
    clerkOrganizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    return org;
  },
});

/**
 * Get organization members
 */
export const getOrganizationMembers = query({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          ...user!,
          role: membership.role,
          membershipId: membership._id,
          joinedAt: membership.createdAt,
        };
      })
    );

    return members;
  },
});

/**
 * Check if user has access to organization
 */
export const hasOrganizationAccess = query({
  args: {
    clerkUserId: v.string(),
    clerkOrganizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      return false;
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (!org) {
      return false;
    }

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', org._id).eq('userId', user._id)
      )
      .first();

    return !!membership;
  },
});

/**
 * Get user's role in organization
 */
export const getUserOrganizationRole = query({
  args: {
    clerkUserId: v.string(),
    clerkOrganizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      return null;
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (!org) {
      return null;
    }

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', org._id).eq('userId', user._id)
      )
      .first();

    return membership?.role ?? null;
  },
});

/**
 * Get user's permissions in organization
 */
export const getUserOrganizationPermissions = query({
  args: {
    clerkUserId: v.string(),
    clerkOrganizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      return [];
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (!org) {
      return [];
    }

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', org._id).eq('userId', user._id)
      )
      .first();

    return membership?.permissions ?? [];
  },
});

/**
 * Check if user has a specific permission
 */
export const hasPermission = query({
  args: {
    clerkUserId: v.string(),
    clerkOrganizationId: v.string(),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      return false;
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (!org) {
      return false;
    }

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', org._id).eq('userId', user._id)
      )
      .first();

    if (!membership) {
      return false;
    }

    // Check if user is admin (has all permissions)
    if (membership.role === 'org:admin' || membership.role === 'admin') {
      return true;
    }

    // Check specific permission
    return membership.permissions.includes(args.permission);
  },
});

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = query({
  args: {
    clerkUserId: v.string(),
    clerkOrganizationId: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      return false;
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (!org) {
      return false;
    }

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', org._id).eq('userId', user._id)
      )
      .first();

    if (!membership) {
      return false;
    }

    // Admins have all permissions
    if (membership.role === 'org:admin' || membership.role === 'admin') {
      return true;
    }

    // Check if user has any of the required permissions
    return args.permissions.some((permission) =>
      membership.permissions.includes(permission)
    );
  },
});

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = query({
  args: {
    clerkUserId: v.string(),
    clerkOrganizationId: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkUserId))
      .first();

    if (!user) {
      return false;
    }

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_organization_id', (q) =>
        q.eq('clerkOrganizationId', args.clerkOrganizationId)
      )
      .first();

    if (!org) {
      return false;
    }

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_and_user', (q) =>
        q.eq('organizationId', org._id).eq('userId', user._id)
      )
      .first();

    if (!membership) {
      return false;
    }

    // Admins have all permissions
    if (membership.role === 'org:admin' || membership.role === 'admin') {
      return true;
    }

    // Check if user has all required permissions
    return args.permissions.every((permission) =>
      membership.permissions.includes(permission)
    );
  },
});
