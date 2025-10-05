import { v } from 'convex/values';
import { mutation, query, action } from './_generated/server';
import { internal } from './_generated/api';

// Get all agents for a restaurant
export const getByRestaurant = query({
  args: { restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('agents')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();
  },
});

// Get agent by ID
export const get = query({
  args: { id: v.id('agents') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db.get(args.id);
  },
});

// Create agent record in database
export const create = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    elevenLabsAgentId: v.string(),
    elevenLabsVoiceId: v.string(),
    voiceName: v.string(),
    name: v.string(),
    greeting: v.string(),
    phoneNumber: v.string(),
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

    const agentId = await ctx.db.insert('agents', {
      restaurantId: args.restaurantId,
      ownerId: user._id,
      elevenLabsAgentId: args.elevenLabsAgentId,
      elevenLabsVoiceId: args.elevenLabsVoiceId,
      phoneNumber: args.phoneNumber,
      name: args.name,
      voiceName: args.voiceName,
      language: 'en-US',
      agentConfig: {
        greeting: args.greeting,
        conversationStyle: 'professional',
        maxConversationDuration: 600,
        enableVoicemail: false,
      },
      knowledgeBaseId: undefined,
      documents: [],
      status: 'active',
      totalCalls: 0,
      totalMinutes: 0,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return agentId;
  },
});

// Update agent documents
export const updateDocuments = mutation({
  args: {
    agentId: v.id('agents'),
    documents: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
        uploadedAt: v.number(),
        size: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      documents: args.documents,
      updatedAt: Date.now(),
    });
  },
});
