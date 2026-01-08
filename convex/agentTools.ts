import { v } from 'convex/values';
import { mutation, query, internalQuery, internalMutation } from './_generated/server';

/**
 * Get all enabled tools for an agent
 */
export const getByAgent = query({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    return await ctx.db
      .query('agentTools')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))
      .collect();
  },
});

/**
 * Check if a specific tool is enabled for an agent (authenticated)
 */
export const isToolEnabled = query({
  args: {
    agentId: v.id('agents'),
    toolName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const tool = await ctx.db
      .query('agentTools')
      .withIndex('by_agent_tool', (q) =>
        q.eq('agentId', args.agentId).eq('toolName', args.toolName)
      )
      .first();

    return tool?.enabled ?? false;
  },
});

/**
 * Check if a specific tool is enabled (internal - no auth, for webhooks)
 */
export const isToolEnabledInternal = internalQuery({
  args: {
    agentId: v.id('agents'),
    toolName: v.string(),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db
      .query('agentTools')
      .withIndex('by_agent_tool', (q) =>
        q.eq('agentId', args.agentId).eq('toolName', args.toolName)
      )
      .first();

    return tool?.enabled ?? false;
  },
});

/**
 * Enable or disable a tool for an agent (authenticated - for client-side use)
 */
export const toggleTool = mutation({
  args: {
    agentId: v.id('agents'),
    toolName: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.object({
      integrationProvider: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    const now = Date.now();

    // Check if record exists
    const existing = await ctx.db
      .query('agentTools')
      .withIndex('by_agent_tool', (q) =>
        q.eq('agentId', args.agentId).eq('toolName', args.toolName)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        config: args.config,
        enabledAt: args.enabled ? now : existing.enabledAt,
        enabledBy: args.enabled ? user._id : existing.enabledBy,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert('agentTools', {
        agentId: args.agentId,
        toolName: args.toolName,
        enabled: args.enabled,
        config: args.config,
        enabledAt: args.enabled ? now : undefined,
        enabledBy: args.enabled ? user._id : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Enable or disable a tool for an agent (server-side - no auth required)
 * Use this from server-side API routes where auth is handled by Next.js
 * Note: This mutation is called from authenticated API routes only
 */
export const toggleToolServer = mutation({
  args: {
    agentId: v.id('agents'),
    toolName: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.object({
      integrationProvider: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if record exists
    const existing = await ctx.db
      .query('agentTools')
      .withIndex('by_agent_tool', (q) =>
        q.eq('agentId', args.agentId).eq('toolName', args.toolName)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        config: args.config,
        enabledAt: args.enabled ? now : existing.enabledAt,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert('agentTools', {
        agentId: args.agentId,
        toolName: args.toolName,
        enabled: args.enabled,
        config: args.config,
        enabledAt: args.enabled ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
