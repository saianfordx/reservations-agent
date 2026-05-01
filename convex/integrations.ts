import { v } from 'convex/values';
import { mutation, query, internalQuery, internalAction } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Get all integrations for a restaurant
 */
export const getByRestaurant = query({
  args: {
    restaurantId: v.id('restaurants'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const integrations = await ctx.db
      .query('integrations')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();

    // Mask API keys for security (only show first/last few chars)
    return integrations.map((integration) => ({
      ...integration,
      apiKey: integration.apiKey
        ? `${integration.apiKey.slice(0, 6)}...${integration.apiKey.slice(-4)}`
        : undefined,
    }));
  },
});

/**
 * Get a specific integration by restaurant and provider
 */
export const getByProvider = query({
  args: {
    restaurantId: v.id('restaurants'),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const integration = await ctx.db
      .query('integrations')
      .withIndex('by_restaurant_provider', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('provider', args.provider)
      )
      .first();

    if (!integration) return null;

    // Mask API key
    return {
      ...integration,
      apiKey: integration.apiKey
        ? `${integration.apiKey.slice(0, 6)}...${integration.apiKey.slice(-4)}`
        : undefined,
    };
  },
});

/**
 * Get full integration details (for internal API use - includes full API key)
 */
export const getByProviderInternal = query({
  args: {
    restaurantId: v.id('restaurants'),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('integrations')
      .withIndex('by_restaurant_provider', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('provider', args.provider)
      )
      .first();
  },
});

/**
 * Create or update The Account integration
 */
export const upsertTheAccount = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    tenantSlug: v.string(),
    apiKey: v.string(),
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

    // Check if integration already exists
    const existing = await ctx.db
      .query('integrations')
      .withIndex('by_restaurant_provider', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('provider', 'the_account')
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing integration
      await ctx.db.patch(existing._id, {
        tenantSlug: args.tenantSlug,
        apiKey: args.apiKey,
        status: 'connected',
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new integration
      const id = await ctx.db.insert('integrations', {
        restaurantId: args.restaurantId,
        provider: 'the_account',
        tenantSlug: args.tenantSlug,
        apiKey: args.apiKey,
        status: 'connected',
        createdAt: now,
        updatedAt: now,
        createdBy: user._id,
      });
      return id;
    }
  },
});

/**
 * Disconnect an integration
 */
export const disconnect = mutation({
  args: {
    integrationId: v.id('integrations'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    await ctx.db.patch(args.integrationId, {
      status: 'disconnected',
      apiKey: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update test result for an integration
 */
export const updateTestResult = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    provider: v.string(),
    success: v.boolean(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query('integrations')
      .withIndex('by_restaurant_provider', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('provider', args.provider)
      )
      .first();

    if (!integration) return;

    await ctx.db.patch(integration._id, {
      lastTestedAt: Date.now(),
      lastTestResult: args.success ? 'success' : args.message,
      status: args.success ? 'connected' : 'error',
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// INTERNAL QUERIES (for use by other Convex functions)
// ============================================

/**
 * Get integration by provider (internal - no auth, includes full API key)
 */
export const getIntegrationInternal = internalQuery({
  args: {
    restaurantId: v.id('restaurants'),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('integrations')
      .withIndex('by_restaurant_provider', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('provider', args.provider)
      )
      .first();
  },
});

// ============================================
// INTERNAL ACTIONS (for forwarding orders to external systems)
// ============================================

/**
 * Forward order to The Account POS system
 * Called after order creation if integration is enabled
 */
export const forwardOrderToTheAccount = internalAction({
  args: {
    restaurantId: v.id('restaurants'),
    orderData: v.object({
      orderId: v.string(),
      customerName: v.string(),
      customerPhone: v.string(),
      items: v.array(
        v.object({
          menuItemId: v.optional(v.string()), // The Account POS menu item ID
          name: v.string(),
          quantity: v.number(),
          specialInstructions: v.optional(v.string()),
        })
      ),
      orderNotes: v.optional(v.string()),
      pickupTime: v.optional(v.string()),
      pickupDate: v.optional(v.string()),
    }),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    // 1. Check if The Account integration is enabled for this restaurant
    // @ts-ignore - Type instantiation depth issue with Convex internal types
    const integration = await ctx.runQuery(internal.integrations.getIntegrationInternal, {
      restaurantId: args.restaurantId,
      provider: 'the_account',
    }) as { status: string; apiKey?: string; tenantSlug?: string } | null;

    if (!integration || integration.status !== 'connected') {
      console.log(`[TheAccount] Integration not connected for restaurant ${args.restaurantId}`);
      return { skipped: true, reason: 'Integration not connected' };
    }

    if (!integration.apiKey || !integration.tenantSlug) {
      console.log(`[TheAccount] Missing credentials for restaurant ${args.restaurantId}`);
      return { skipped: true, reason: 'Missing API key or tenant slug' };
    }

    // 2. Determine webhook URL based on DEV_MODE
    const isDevMode: boolean = process.env.DEV_MODE === 'true';
    const webhookUrl: string = isDevMode
      ? 'http://localhost:9090/api/v2/webhook/nerdvi/order'
      : `https://the-account.vortex.studio/tn/${integration.tenantSlug}/api/v2/webhook/nerdvi/order`;


    console.log(`[TheAccount] Forwarding order ${args.orderData.orderId} to ${webhookUrl} (DEV_MODE=${isDevMode})`);

    // 3. Format the order data for The Account's API
    const theAccountPayload = {
      external_order_id: `nerdvi-${args.orderData.orderId}`,
      external_agent_id: args.agentId || 'nerdvi-agent',
      customer_name: args.orderData.customerName,
      customer_phone: args.orderData.customerPhone,
      items: args.orderData.items.map((item) => ({
        // Use real menu_item_id from The Account if available, otherwise generate fallback
        menu_item_id: item.menuItemId || `unknown-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: item.name,
        quantity: item.quantity,
        special_instructions: item.specialInstructions,
      })),
      order_notes: args.orderData.orderNotes,
      pickup_time: args.orderData.pickupTime || '12:00',
      pickup_date: args.orderData.pickupDate,
    };

    // 4. Send the order to The Account
    try {
      const response: Response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': integration.apiKey,
        },
        body: JSON.stringify(theAccountPayload),
      });

      const responseData = await response.json().catch(() => ({})) as Record<string, unknown>;

      if (!response.ok) {
        console.error(`[TheAccount] Failed to forward order: ${response.status}`, responseData);
        return {
          success: false,
          status: response.status,
          error: responseData.error || 'Unknown error',
        };
      }

      console.log(`[TheAccount] Order forwarded successfully:`, responseData);
      return {
        success: true,
        theAccountOrderId: responseData.id,
        queueStatus: responseData.queue_status,
        autoAccepted: responseData.auto_accepted,
      };
    } catch (error) {
      console.error(`[TheAccount] Network error forwarding order:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },
});
