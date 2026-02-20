import { v } from 'convex/values';
import { mutation, query, action, internalQuery, internalMutation } from './_generated/server';
import { internal } from './_generated/api';

// Validators for new agent configuration fields
const languagesValidator = v.optional(v.object({
  defaultLanguage: v.string(),
  additionalLanguages: v.array(v.string()),
}));

const voiceConfigValidator = v.object({
  voiceId: v.string(),
  voiceName: v.string(),
  language: v.string(),
  stability: v.number(),
  speed: v.number(),
  similarityBoost: v.number(),
});

const voiceSettingsValidator = v.optional(v.object({
  primaryVoice: voiceConfigValidator,
  additionalVoices: v.array(v.object({
    voiceId: v.string(),
    voiceName: v.string(),
    voiceLabel: v.string(),
    language: v.string(),
    stability: v.number(),
    speed: v.number(),
    similarityBoost: v.number(),
  })),
  ttsModelId: v.string(),
}));

const llmSettingsValidator = v.optional(v.object({
  provider: v.string(),
  model: v.string(),
  temperature: v.number(),
  reasoningEffort: v.optional(v.string()),
  maxTokens: v.number(),
  backupLlm: v.optional(v.object({
    enabled: v.boolean(),
    model: v.string(),
  })),
}));

const conversationBehaviorValidator = v.optional(v.object({
  eagerness: v.string(),
  turnTimeout: v.number(),
  silenceEndCallTimeout: v.number(),
  maxDuration: v.number(),
  softTimeout: v.optional(v.object({
    enabled: v.boolean(),
    timeoutSeconds: v.number(),
    message: v.string(),
  })),
}));

const firstMessageSettingsValidator = v.optional(v.object({
  defaultMessage: v.string(),
  interruptible: v.boolean(),
  translateToAll: v.boolean(),
  perLanguageMessages: v.optional(v.array(v.object({
    language: v.string(),
    message: v.string(),
  }))),
}));

const audioSettingsValidator = v.optional(v.object({
  userInputFormat: v.string(),
  agentOutputFormat: v.optional(v.string()),
}));

// Get all agents for a restaurant (public - requires auth)
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

// Public query for server-side API calls (no auth required)
// Used by backend API routes to fetch agent data
export const getByRestaurantServerSide = query({
  args: { restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    // No auth check - this is for server-to-server calls
    // The API route itself is protected by being server-side only
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

// Get agent by ID (server-side - no auth required, for webhook use)
export const getAgentServerSide = query({
  args: { id: v.id('agents') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get agent by ElevenLabs agent ID
export const getByElevenLabsAgentId = query({
  args: { elevenLabsAgentId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('agents')
      .withIndex('by_elevenlabs_agent_id', (q) => q.eq('elevenLabsAgentId', args.elevenLabsAgentId))
      .first();
  },
});

// Internal version for webhook/action use (no auth required)
export const getByElevenLabsAgentIdInternal = internalQuery({
  args: { elevenLabsAgentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agents')
      .withIndex('by_elevenlabs_agent_id', (q) => q.eq('elevenLabsAgentId', args.elevenLabsAgentId))
      .first();
  },
});

// Create agent record in database
export const create = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    elevenLabsAgentId: v.string(),
    elevenLabsVoiceId: v.string(),
    elevenLabsPhoneNumberId: v.optional(v.string()),
    voiceName: v.string(),
    name: v.string(),
    greeting: v.string(),
    phoneNumber: v.string(),
    prompt: v.optional(v.string()),
    // New configuration fields
    languages: languagesValidator,
    voiceSettings: voiceSettingsValidator,
    llmSettings: llmSettingsValidator,
    conversationBehavior: conversationBehaviorValidator,
    firstMessageSettings: firstMessageSettingsValidator,
    audioSettings: audioSettingsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) throw new Error('User not found');

    // Get the restaurant to retrieve organizationId
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const now = Date.now();

    const agentId = await ctx.db.insert('agents', {
      restaurantId: args.restaurantId,
      organizationId: restaurant.organizationId,
      ownerId: user._id,
      elevenLabsAgentId: args.elevenLabsAgentId,
      elevenLabsVoiceId: args.elevenLabsVoiceId,
      elevenLabsPhoneNumberId: args.elevenLabsPhoneNumberId,
      phoneNumber: args.phoneNumber,
      name: args.name,
      voiceName: args.voiceName,
      language: args.languages?.defaultLanguage || 'en',
      prompt: args.prompt,
      // New configuration fields
      languages: args.languages,
      voiceSettings: args.voiceSettings,
      llmSettings: args.llmSettings,
      conversationBehavior: args.conversationBehavior,
      firstMessageSettings: args.firstMessageSettings,
      audioSettings: args.audioSettings,
      // Legacy agentConfig (for backwards compatibility)
      agentConfig: {
        greeting: args.greeting,
        conversationStyle: 'professional',
        maxConversationDuration: args.conversationBehavior?.maxDuration || 600,
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

// Update agent settings (name, voice, greeting, prompt, and new config fields)
export const update = mutation({
  args: {
    agentId: v.id('agents'),
    name: v.optional(v.string()),
    voiceId: v.optional(v.string()),
    voiceName: v.optional(v.string()),
    greeting: v.optional(v.string()),
    prompt: v.optional(v.string()),
    // New configuration fields
    languages: languagesValidator,
    voiceSettings: voiceSettingsValidator,
    llmSettings: llmSettingsValidator,
    conversationBehavior: conversationBehaviorValidator,
    firstMessageSettings: firstMessageSettingsValidator,
    audioSettings: audioSettingsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error('Agent not found');

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Basic fields
    if (args.name !== undefined) updates.name = args.name;
    if (args.voiceId !== undefined) updates.elevenLabsVoiceId = args.voiceId;
    if (args.voiceName !== undefined) updates.voiceName = args.voiceName;
    if (args.prompt !== undefined) updates.prompt = args.prompt;
    if (args.greeting !== undefined) {
      updates.agentConfig = {
        ...agent.agentConfig,
        greeting: args.greeting,
      };
    }

    // New configuration fields
    if (args.languages !== undefined) {
      updates.languages = args.languages;
      updates.language = args.languages.defaultLanguage;
    }
    if (args.voiceSettings !== undefined) updates.voiceSettings = args.voiceSettings;
    if (args.llmSettings !== undefined) updates.llmSettings = args.llmSettings;
    if (args.conversationBehavior !== undefined) {
      updates.conversationBehavior = args.conversationBehavior;
      // Also update legacy agentConfig.maxConversationDuration
      if (args.conversationBehavior.maxDuration) {
        updates.agentConfig = {
          ...(updates.agentConfig || agent.agentConfig),
          maxConversationDuration: args.conversationBehavior.maxDuration,
        };
      }
    }
    if (args.firstMessageSettings !== undefined) updates.firstMessageSettings = args.firstMessageSettings;
    if (args.audioSettings !== undefined) updates.audioSettings = args.audioSettings;

    await ctx.db.patch(args.agentId, updates);

    return { success: true };
  },
});

// Internal query to get agents by restaurant (for sync action)
export const getAgentsByRestaurantInternal = internalQuery({
  args: { restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agents')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();
  },
});

// Internal mutation to update agent prompt
export const updatePromptInternal = internalMutation({
  args: {
    agentId: v.id('agents'),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      prompt: args.prompt,
      updatedAt: Date.now(),
    });
  },
});

// Action to sync agent prompts with restaurant hours
export const syncPromptWithHours = action({
  args: {
    restaurantId: v.id('restaurants'),
    restaurantName: v.string(),
    // Using v.any() to avoid TypeScript deep type instantiation issues
    // The operatingHours structure is validated at the API layer
    operatingHours: v.any(),
    // Per-agent prompts: Record<agentId, prompt>
    // Each agent gets its own prompt with their specific persona name
    agentPrompts: v.any(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    results?: Array<{ agentId: string; success: boolean; error?: string }>;
  }> => {
    // Get all agents for this restaurant
    const agents = await ctx.runQuery(internal.agents.getAgentsByRestaurantInternal, {
      restaurantId: args.restaurantId,
    });

    if (!agents || agents.length === 0) {
      return { success: true, message: 'No agents to sync' };
    }

    const agentPrompts = args.agentPrompts as Record<string, string>;

    // Update each agent with their specific prompt
    const results = await Promise.all(
      agents.map(async (agent) => {
        try {
          // Get the prompt for this specific agent
          const prompt = agentPrompts[agent._id];
          if (!prompt) {
            console.warn(`No prompt found for agent ${agent._id}, skipping`);
            return { agentId: agent._id, success: false, error: 'No prompt provided' };
          }

          // Update in Convex
          await ctx.runMutation(internal.agents.updatePromptInternal, {
            agentId: agent._id,
            prompt: prompt,
          });

          // Update in ElevenLabs
          const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`,
            {
              method: 'PATCH',
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                conversation_config: {
                  agent: {
                    prompt: {
                      prompt: prompt,
                    },
                  },
                },
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error(`Failed to update ElevenLabs agent ${agent.elevenLabsAgentId}:`, error);
            return { agentId: agent._id, success: false, error };
          }

          return { agentId: agent._id, success: true };
        } catch (error) {
          console.error(`Error updating agent ${agent._id}:`, error);
          return { agentId: agent._id, success: false, error: String(error) };
        }
      })
    );

    return { success: true, results };
  },
});
