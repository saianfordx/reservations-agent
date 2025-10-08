import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ============================================
// KNOWLEDGE BASE ITEMS
// ============================================

/**
 * Get all knowledge base items for an organization
 */
export const getByOrganization = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('knowledgeBaseItems')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect();
  },
});

/**
 * Get knowledge base items attached to a specific agent
 */
export const getByAgent = query({
  args: { agentId: v.id('agents') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the agent to verify access
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error('Agent not found');

    // Get all mappings for this agent
    const mappings = await ctx.db
      .query('agentKnowledgeBase')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))
      .collect();

    // Get the actual knowledge base items
    const items = await Promise.all(
      mappings.map(async (mapping) => {
        const item = await ctx.db.get(mapping.knowledgeBaseItemId);
        return item ? { ...item, addedAt: mapping.addedAt } : null;
      })
    );

    return items.filter((item) => item !== null);
  },
});

/**
 * Get a single knowledge base item by ID
 */
export const get = query({
  args: { id: v.id('knowledgeBaseItems') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new knowledge base item
 */
export const create = mutation({
  args: {
    organizationId: v.id('organizations'),
    elevenLabsFileId: v.string(),
    name: v.string(),
    type: v.string(), // 'document' or 'text'
    content: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) throw new Error('User not found');

    const now = Date.now();

    const itemId = await ctx.db.insert('knowledgeBaseItems', {
      organizationId: args.organizationId,
      elevenLabsFileId: args.elevenLabsFileId,
      name: args.name,
      type: args.type,
      content: args.content,
      fileUrl: args.fileUrl,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      uploadedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

/**
 * Update a knowledge base item (for editing text content)
 */
export const update = mutation({
  args: {
    id: v.id('knowledgeBaseItems'),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    elevenLabsFileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error('Knowledge base item not found');

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.content !== undefined) updates.content = args.content;
    if (args.elevenLabsFileId !== undefined) updates.elevenLabsFileId = args.elevenLabsFileId;

    await ctx.db.patch(args.id, updates);

    return { success: true };
  },
});

/**
 * Delete a knowledge base item
 */
export const deleteItem = mutation({
  args: { id: v.id('knowledgeBaseItems') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Delete all agent mappings first
    const mappings = await ctx.db
      .query('agentKnowledgeBase')
      .withIndex('by_knowledge_item', (q) => q.eq('knowledgeBaseItemId', args.id))
      .collect();

    for (const mapping of mappings) {
      await ctx.db.delete(mapping._id);
    }

    // Delete the item
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// ============================================
// AGENT KNOWLEDGE BASE MAPPINGS
// ============================================

/**
 * Add a knowledge base item to an agent
 */
export const addToAgent = mutation({
  args: {
    agentId: v.id('agents'),
    knowledgeBaseItemId: v.id('knowledgeBaseItems'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Check if mapping already exists
    const existing = await ctx.db
      .query('agentKnowledgeBase')
      .withIndex('by_agent_and_item', (q) =>
        q.eq('agentId', args.agentId).eq('knowledgeBaseItemId', args.knowledgeBaseItemId)
      )
      .first();

    if (existing) {
      return { success: true, mappingId: existing._id };
    }

    const mappingId = await ctx.db.insert('agentKnowledgeBase', {
      agentId: args.agentId,
      knowledgeBaseItemId: args.knowledgeBaseItemId,
      addedAt: Date.now(),
    });

    return { success: true, mappingId };
  },
});

/**
 * Remove a knowledge base item from an agent
 */
export const removeFromAgent = mutation({
  args: {
    agentId: v.id('agents'),
    knowledgeBaseItemId: v.id('knowledgeBaseItems'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const mapping = await ctx.db
      .query('agentKnowledgeBase')
      .withIndex('by_agent_and_item', (q) =>
        q.eq('agentId', args.agentId).eq('knowledgeBaseItemId', args.knowledgeBaseItemId)
      )
      .first();

    if (mapping) {
      await ctx.db.delete(mapping._id);
    }

    return { success: true };
  },
});

/**
 * Get all agents using a specific knowledge base item
 */
export const getAgentsUsingItem = query({
  args: { knowledgeBaseItemId: v.id('knowledgeBaseItems') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const mappings = await ctx.db
      .query('agentKnowledgeBase')
      .withIndex('by_knowledge_item', (q) => q.eq('knowledgeBaseItemId', args.knowledgeBaseItemId))
      .collect();

    const agents = await Promise.all(
      mappings.map(async (mapping) => {
        return await ctx.db.get(mapping.agentId);
      })
    );

    return agents.filter((agent) => agent !== null);
  },
});
