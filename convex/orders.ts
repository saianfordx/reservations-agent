import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Generate a unique 4-digit order ID
 */
async function generateOrderId(
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
      .query('orders')
      .withIndex('by_order_id', (q: any) =>
        q.eq('restaurantId', restaurantId).eq('orderId', id)
      )
      .first();

    if (!existing) {
      return id;
    }

    attempts++;
  }

  throw new Error('Could not generate unique order ID');
}

/**
 * Create a new order
 */
export const create = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    agentId: v.id('agents'),
    customerName: v.string(),
    customerPhone: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        specialInstructions: v.optional(v.string()),
      })
    ),
    orderNotes: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupDate: v.optional(v.string()),
    callId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate unique order ID
    const orderId = await generateOrderId(ctx, args.restaurantId);

    const now = Date.now();

    // Get restaurant details for email notification
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Create order
    const id = await ctx.db.insert('orders', {
      restaurantId: args.restaurantId,
      agentId: args.agentId,
      orderId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      items: args.items,
      orderNotes: args.orderNotes,
      pickupTime: args.pickupTime,
      pickupDate: args.pickupDate,
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
    ctx.scheduler.runAfter(0, internal.notifications.sendOrderNotification, {
      orderId: id,
      restaurantId: args.restaurantId,
      orderData: {
        orderId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        items: args.items,
        orderNotes: args.orderNotes,
        pickupTime: args.pickupTime,
        pickupDate: args.pickupDate,
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
      orderId,
    };
  },
});

/**
 * Update an existing order
 */
export const update = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    orderId: v.string(),
    items: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          specialInstructions: v.optional(v.string()),
        })
      )
    ),
    orderNotes: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find order
    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_id', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('orderId', args.orderId)
      )
      .first();

    if (!order) {
      throw new Error(`Order ${args.orderId} not found`);
    }

    if (order.status === 'cancelled') {
      throw new Error('Cannot modify a cancelled order');
    }

    const now = Date.now();
    const changes: Record<string, any> = {};

    // Build update object and track changes
    const updates: any = {
      updatedAt: now,
    };

    if (args.items !== undefined) {
      changes.items = { from: order.items, to: args.items };
      updates.items = args.items;
    }

    if (args.orderNotes !== undefined) {
      changes.orderNotes = { from: order.orderNotes, to: args.orderNotes };
      updates.orderNotes = args.orderNotes;
    }

    if (args.pickupTime !== undefined) {
      changes.pickupTime = { from: order.pickupTime, to: args.pickupTime };
      updates.pickupTime = args.pickupTime;
    }

    if (args.pickupDate !== undefined) {
      changes.pickupDate = { from: order.pickupDate, to: args.pickupDate };
      updates.pickupDate = args.pickupDate;
    }

    // Update history
    updates.history = [
      ...order.history,
      {
        action: 'updated',
        timestamp: now,
        changes,
        modifiedBy: 'phone_agent',
      },
    ];

    await ctx.db.patch(order._id, updates);

    // Get restaurant details for email notification
    const restaurant = await ctx.db.get(args.restaurantId);
    if (restaurant) {
      // Get admin emails
      const adminEmails: string[] = [];

      if (restaurant.organizationId) {
        const organization = await ctx.db.get(restaurant.organizationId);
        if (organization) {
          const orgOwner = await ctx.db.get(organization.createdBy);
          if (orgOwner?.email) {
            adminEmails.push(orgOwner.email);
          }
        }

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
        const owner = await ctx.db.get(restaurant.ownerId);
        if (owner?.email) {
          adminEmails.push(owner.email);
        }
      }

      if (restaurant.settings.notificationEmails) {
        for (const email of restaurant.settings.notificationEmails) {
          if (email && !adminEmails.includes(email)) {
            adminEmails.push(email);
          }
        }
      }

      // Get updated order data
      const updatedOrder = await ctx.db.get(order._id);

      // Build changes object for notification
      const notificationChanges: any = {};
      if (changes.items) {
        notificationChanges.items = true;
      }
      if (changes.orderNotes) {
        notificationChanges.orderNotes = true;
      }
      if (changes.pickupTime) {
        notificationChanges.pickupTime = {
          from: changes.pickupTime.from,
          to: changes.pickupTime.to,
        };
      }
      if (changes.pickupDate) {
        notificationChanges.pickupDate = {
          from: changes.pickupDate.from,
          to: changes.pickupDate.to,
        };
      }

      // Send update notification email
      // @ts-ignore - Type instantiation depth issue with Convex internal types
      ctx.scheduler.runAfter(0, internal.notifications.sendOrderUpdateNotification, {
        orderId: order._id,
        restaurantId: args.restaurantId,
        orderData: {
          orderId: order.orderId,
          customerName: updatedOrder?.customerName || order.customerName,
          customerPhone: updatedOrder?.customerPhone || order.customerPhone,
          items: updatedOrder?.items || order.items,
          orderNotes: updatedOrder?.orderNotes || order.orderNotes,
          pickupTime: updatedOrder?.pickupTime || order.pickupTime,
          pickupDate: updatedOrder?.pickupDate || order.pickupDate,
        },
        changes: notificationChanges,
        restaurantData: {
          name: restaurant.name,
          address: restaurant.location.address,
          city: restaurant.location.city,
          state: restaurant.location.state,
          contactEmail: restaurant.contact.email,
        },
        adminEmails,
      });
    }

    return {
      success: true,
      orderId: args.orderId,
    };
  },
});

/**
 * Cancel an order
 */
export const cancel = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find order
    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_id', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('orderId', args.orderId)
      )
      .first();

    if (!order) {
      throw new Error(`Order ${args.orderId} not found`);
    }

    if (order.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }

    const now = Date.now();

    await ctx.db.patch(order._id, {
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
      history: [
        ...order.history,
        {
          action: 'cancelled',
          timestamp: now,
          modifiedBy: 'phone_agent',
        },
      ],
    });

    // Get restaurant details for email notification
    const restaurant = await ctx.db.get(args.restaurantId);
    if (restaurant) {
      // Get admin emails
      const adminEmails: string[] = [];

      if (restaurant.organizationId) {
        const organization = await ctx.db.get(restaurant.organizationId);
        if (organization) {
          const orgOwner = await ctx.db.get(organization.createdBy);
          if (orgOwner?.email) {
            adminEmails.push(orgOwner.email);
          }
        }

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
        const owner = await ctx.db.get(restaurant.ownerId);
        if (owner?.email) {
          adminEmails.push(owner.email);
        }
      }

      if (restaurant.settings.notificationEmails) {
        for (const email of restaurant.settings.notificationEmails) {
          if (email && !adminEmails.includes(email)) {
            adminEmails.push(email);
          }
        }
      }

      // Send cancellation notification email
      // @ts-ignore - Type instantiation depth issue with Convex internal types
      ctx.scheduler.runAfter(0, internal.notifications.sendOrderCancellationNotification, {
        orderId: order._id,
        restaurantId: args.restaurantId,
        orderData: {
          orderId: order.orderId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          })),
          pickupTime: order.pickupTime,
          pickupDate: order.pickupDate,
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
    }

    return {
      success: true,
      orderId: args.orderId,
    };
  },
});

/**
 * Get all orders for a restaurant
 */
export const listByRestaurant = query({
  args: {
    restaurantId: v.id('restaurants'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let orders;

    if (args.status) {
      const status = args.status;
      orders = await ctx.db
        .query('orders')
        .withIndex('by_restaurant_status', (q) =>
          q.eq('restaurantId', args.restaurantId).eq('status', status)
        )
        .collect();
    } else {
      orders = await ctx.db
        .query('orders')
        .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
        .collect();
    }

    return orders.sort((a, b) => {
      // Sort by pickup date, then pickup time
      const dateA = a.pickupDate || '';
      const dateB = b.pickupDate || '';
      const dateCompare = dateB.localeCompare(dateA); // Most recent first
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.pickupTime || '';
      const timeB = b.pickupTime || '';
      return timeB.localeCompare(timeA);
    });
  },
});

/**
 * Get orders by date range
 */
export const listByDateRange = query({
  args: {
    restaurantId: v.id('restaurants'),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();

    return orders
      .filter((o) => {
        const pickupDate = o.pickupDate || '';
        return pickupDate >= args.startDate && pickupDate <= args.endDate;
      })
      .sort((a, b) => {
        const dateA = a.pickupDate || '';
        const dateB = b.pickupDate || '';
        const dateCompare = dateB.localeCompare(dateA); // Most recent first
        if (dateCompare !== 0) return dateCompare;

        const timeA = a.pickupTime || '';
        const timeB = b.pickupTime || '';
        return timeB.localeCompare(timeA);
      });
  },
});

/**
 * Get a single order by ID
 */
export const getByOrderId = query({
  args: {
    restaurantId: v.id('restaurants'),
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_order_id', (q) =>
        q.eq('restaurantId', args.restaurantId).eq('orderId', args.orderId)
      )
      .first();
  },
});

/**
 * Create a new order manually (from dashboard)
 */
export const createManual = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    customerName: v.string(),
    customerPhone: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        specialInstructions: v.optional(v.string()),
      })
    ),
    orderNotes: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Generate unique order ID
    const orderId = await generateOrderId(ctx, args.restaurantId);

    const now = Date.now();

    // Get restaurant details for email notification
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Create order
    const id = await ctx.db.insert('orders', {
      restaurantId: args.restaurantId,
      orderId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      items: args.items,
      orderNotes: args.orderNotes,
      pickupTime: args.pickupTime,
      pickupDate: args.pickupDate,
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
    ctx.scheduler.runAfter(0, internal.notifications.sendOrderNotification, {
      orderId: id,
      restaurantId: args.restaurantId,
      orderData: {
        orderId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        items: args.items,
        orderNotes: args.orderNotes,
        pickupTime: args.pickupTime,
        pickupDate: args.pickupDate,
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
      orderId,
    };
  },
});

/**
 * Update an existing order manually (from dashboard)
 */
export const updateManual = mutation({
  args: {
    id: v.id('orders'),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    items: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          specialInstructions: v.optional(v.string()),
        })
      )
    ),
    orderNotes: v.optional(v.string()),
    pickupTime: v.optional(v.string()),
    pickupDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Find order
    const order = await ctx.db.get(args.id);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'cancelled') {
      throw new Error('Cannot modify a cancelled order');
    }

    const now = Date.now();
    const changes: Record<string, any> = {};

    // Build update object and track changes
    const updates: any = {
      updatedAt: now,
    };

    if (args.customerName !== undefined) {
      changes.customerName = { from: order.customerName, to: args.customerName };
      updates.customerName = args.customerName;
    }

    if (args.customerPhone !== undefined) {
      changes.customerPhone = { from: order.customerPhone, to: args.customerPhone };
      updates.customerPhone = args.customerPhone;
    }

    if (args.items !== undefined) {
      changes.items = { from: order.items, to: args.items };
      updates.items = args.items;
    }

    if (args.orderNotes !== undefined) {
      changes.orderNotes = { from: order.orderNotes, to: args.orderNotes };
      updates.orderNotes = args.orderNotes;
    }

    if (args.pickupTime !== undefined) {
      changes.pickupTime = { from: order.pickupTime, to: args.pickupTime };
      updates.pickupTime = args.pickupTime;
    }

    if (args.pickupDate !== undefined) {
      changes.pickupDate = { from: order.pickupDate, to: args.pickupDate };
      updates.pickupDate = args.pickupDate;
    }

    // Update history
    updates.history = [
      ...order.history,
      {
        action: 'updated',
        timestamp: now,
        changes,
        modifiedBy: identity.email || 'manual',
      },
    ];

    await ctx.db.patch(order._id, updates);

    return {
      success: true,
      orderId: order.orderId,
    };
  },
});

/**
 * Delete an order permanently (from dashboard)
 */
export const deleteOrder = mutation({
  args: {
    id: v.id('orders'),
  },
  handler: async (ctx, args) => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Delete the order
    await ctx.db.delete(args.id);

    return {
      success: true,
    };
  },
});

/**
 * Search for orders by name, date, and/or phone (for agent use)
 */
export const searchOrders = query({
  args: {
    restaurantId: v.id('restaurants'),
    customerName: v.optional(v.string()),
    pickupDate: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all orders for the restaurant
    const allOrders = await ctx.db
      .query('orders')
      .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
      .collect();

    // Filter based on search criteria
    let results = allOrders;

    // Filter by customer name (case-insensitive partial match)
    if (args.customerName) {
      const searchName = args.customerName.toLowerCase().trim();
      results = results.filter((o) =>
        o.customerName.toLowerCase().includes(searchName)
      );
    }

    // Filter by pickup date (exact match)
    if (args.pickupDate) {
      results = results.filter((o) => o.pickupDate === args.pickupDate);
    }

    // Filter by phone (partial match)
    if (args.customerPhone) {
      const searchPhone = args.customerPhone.replace(/\D/g, ''); // Remove non-digits
      results = results.filter((o) => {
        if (!o.customerPhone) return false;
        const normalizedPhone = o.customerPhone.replace(/\D/g, '');
        return normalizedPhone.includes(searchPhone);
      });
    }

    // Sort by pickup date and time (most recent first)
    results.sort((a, b) => {
      const dateA = a.pickupDate || '';
      const dateB = b.pickupDate || '';
      const dateCompare = dateB.localeCompare(dateA);
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.pickupTime || '';
      const timeB = b.pickupTime || '';
      return timeB.localeCompare(timeA);
    });

    // Limit to 10 results to avoid overwhelming the agent
    return results.slice(0, 10);
  },
});

/**
 * Get a single order by its internal ID (for notifications)
 */
export const getById = query({
  args: {
    id: v.id('orders'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
