/**
 * ElevenLabs Tool Definitions for Reservation and Order Management
 */

// ==================== RESERVATION TOOLS ====================

export const createReservationTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'create_reservation',
  description: 'Creates a new restaurant reservation with customer details. Call this function after collecting all required information from the customer, including their phone number.',
  api_schema: {
    description: 'This endpoint creates a new reservation in the restaurant system. It will return a confirmation message with a 4-digit reservation ID that you should provide to the customer.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/create?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Extract reservation details from the conversation. Collect the customer\'s full name, preferred date and time, party size, phone number (REQUIRED for tracking), and any special requests.',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Full name of the customer making the reservation',
        },
        date: {
          type: 'string',
          description: 'Reservation date in YYYY-MM-DD format',
        },
        time: {
          type: 'string',
          description: 'Reservation time in HH:MM 24-hour format',
        },
        party_size: {
          type: 'number',
          description: 'Number of guests for the reservation',
        },
        customer_phone: {
          type: 'string',
          description: 'Customer phone number (REQUIRED - used for tracking and making changes to the reservation)',
        },
        special_requests: {
          type: 'string',
          description: 'Any special requests or dietary restrictions (optional)',
        },
      },
      required: ['customer_name', 'date', 'time', 'party_size', 'customer_phone'],
    },
  },
});

export const editReservationTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'edit_reservation',
  description: 'Modifies an existing reservation. Use this when a customer wants to change their reservation date, time, or party size.',
  api_schema: {
    description: 'This endpoint updates an existing reservation. You must provide the reservation ID and at least one field to update (date, time, or party_size).',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/edit?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Extract the reservation ID from the customer and any fields they want to modify (date, time, or party size). Only include fields that the customer wants to change.',
      properties: {
        reservation_id: {
          type: 'string',
          description: '4-digit reservation ID',
        },
        date: {
          type: 'string',
          description: 'New reservation date in YYYY-MM-DD format (optional)',
        },
        time: {
          type: 'string',
          description: 'New reservation time in HH:MM format (optional)',
        },
        party_size: {
          type: 'number',
          description: 'New party size (optional)',
        },
      },
      required: ['reservation_id'],
    },
  },
});

export const cancelReservationTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'cancel_reservation',
  description: 'Cancels an existing reservation. Use this when a customer wants to cancel their reservation.',
  api_schema: {
    description: 'This endpoint cancels an existing reservation. You must provide the 4-digit reservation ID. The cancellation is permanent.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/cancel?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Extract the 4-digit reservation ID that the customer wants to cancel from the conversation.',
      properties: {
        reservation_id: {
          type: 'string',
          description: '4-digit reservation ID to cancel',
        },
      },
      required: ['reservation_id'],
    },
  },
});

export const getCurrentDateTimeTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'get_current_datetime',
  description: 'IMPORTANT: Call this function at the START of EVERY conversation to get the current date and time in the restaurant\'s timezone. Use this information for all date calculations and validations.',
  api_schema: {
    description: 'Returns the current date, time, day of week, and year in the restaurant\'s timezone. Use this to validate dates and calculate relative dates like "tomorrow" or "next Tuesday".',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/datetime?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'No parameters needed. This function automatically returns the current date and time for the restaurant.',
      properties: {},
      required: [],
    },
  },
});

export const searchReservationsTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'search_reservations',
  description: 'Search for reservations by customer name, date, or phone number. Use this when a customer wants to modify or cancel a reservation but doesn\'t have their reservation ID. Always call this BEFORE attempting to edit or cancel a reservation.',
  api_schema: {
    description: 'This endpoint searches for reservations matching the provided criteria. You can search by name, date, phone number, or any combination. Returns a list of matching reservations with their details including reservation IDs.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/search?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Provide any combination of search criteria from the conversation. At least one field must be provided. Use partial matches for names (e.g., "John" will match "John Smith").',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Customer name or partial name (optional)',
        },
        date: {
          type: 'string',
          description: 'Reservation date in YYYY-MM-DD format (optional)',
        },
        customer_phone: {
          type: 'string',
          description: 'Customer phone number (optional)',
        },
      },
      required: [],
    },
  },
});

// ==================== TO-GO ORDER TOOLS ====================

export const createOrderTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'create_order',
  description: 'Creates a new to-go order with customer details and menu items. Call this function after collecting all required information from the customer including their phone number and the items they want to order.',
  api_schema: {
    description: 'This endpoint creates a new to-go order in the restaurant system. It will return a confirmation message with a 4-digit order ID that you should provide to the customer.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/orders/create?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Extract order details from the conversation. Collect the customer\'s full name, phone number (REQUIRED), list of items with quantities, and any special instructions or pickup time preferences.',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Full name of the customer placing the order',
        },
        customer_phone: {
          type: 'string',
          description: 'Customer phone number (REQUIRED - used for tracking and making changes to the order)',
        },
        items: {
          type: 'array',
          description: 'List of items the customer wants to order',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the menu item',
              },
              quantity: {
                type: 'number',
                description: 'Quantity of this item',
              },
              special_instructions: {
                type: 'string',
                description: 'Any special instructions for this item (optional)',
              },
            },
            required: ['name', 'quantity'],
          },
        },
        order_notes: {
          type: 'string',
          description: 'General notes or instructions for the entire order (optional)',
        },
        pickup_time: {
          type: 'string',
          description: 'Preferred pickup time in HH:MM 24-hour format (optional, defaults to ASAP)',
        },
        pickup_date: {
          type: 'string',
          description: 'Pickup date in YYYY-MM-DD format (optional, defaults to today)',
        },
      },
      required: ['customer_name', 'customer_phone', 'items'],
    },
  },
});

export const editOrderTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'edit_order',
  description: 'Modifies an existing to-go order. Use this when a customer wants to change their order items, pickup time, or add notes.',
  api_schema: {
    description: 'This endpoint updates an existing order. You must provide the order ID and at least one field to update (items, order_notes, pickup_time, or pickup_date).',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/orders/edit?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Extract the order ID from the customer and any fields they want to modify. Only include fields that the customer wants to change.',
      properties: {
        order_id: {
          type: 'string',
          description: '4-digit order ID',
        },
        items: {
          type: 'array',
          description: 'Updated list of items (optional)',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the menu item',
              },
              quantity: {
                type: 'number',
                description: 'Quantity of this item',
              },
              special_instructions: {
                type: 'string',
                description: 'Any special instructions for this item (optional)',
              },
            },
            required: ['name', 'quantity'],
          },
        },
        order_notes: {
          type: 'string',
          description: 'Updated order notes (optional)',
        },
        pickup_time: {
          type: 'string',
          description: 'New pickup time in HH:MM format (optional)',
        },
        pickup_date: {
          type: 'string',
          description: 'New pickup date in YYYY-MM-DD format (optional)',
        },
      },
      required: ['order_id'],
    },
  },
});

export const cancelOrderTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'cancel_order',
  description: 'Cancels an existing to-go order. Use this when a customer wants to cancel their order.',
  api_schema: {
    description: 'This endpoint cancels an existing order. You must provide the 4-digit order ID. The cancellation is permanent.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/orders/cancel?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Extract the 4-digit order ID that the customer wants to cancel from the conversation.',
      properties: {
        order_id: {
          type: 'string',
          description: '4-digit order ID to cancel',
        },
      },
      required: ['order_id'],
    },
  },
});

export const searchOrdersTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'search_orders',
  description: 'Search for to-go orders by customer name, pickup date, or phone number. Use this when a customer wants to modify or cancel an order but doesn\'t have their order ID. Always call this BEFORE attempting to edit or cancel an order.',
  api_schema: {
    description: 'This endpoint searches for orders matching the provided criteria. You can search by name, pickup date, phone number, or any combination. Returns a list of matching orders with their details including order IDs.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/orders/search?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Provide any combination of search criteria from the conversation. At least one field must be provided. Use partial matches for names (e.g., "John" will match "John Smith").',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Customer name or partial name (optional)',
        },
        pickup_date: {
          type: 'string',
          description: 'Pickup date in YYYY-MM-DD format (optional)',
        },
        customer_phone: {
          type: 'string',
          description: 'Customer phone number (optional)',
        },
      },
      required: [],
    },
  },
});

// ==================== MENU TOOL ====================

export const getMenuTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'get_menu',
  description: 'Retrieves the restaurant menu with categories, items, prices, descriptions, and allergen information. Call this when a customer asks about the menu, wants to know what items are available, asks about prices, or wants to know about ingredients or allergens.',
  api_schema: {
    description: 'This endpoint fetches the current restaurant menu from the POS system. Returns all active menu categories and items with their details including prices (in dollars), descriptions, and allergen warnings.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/menu?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'No parameters required. The menu is automatically retrieved for the restaurant.',
      properties: {},
      required: [],
    },
  },
});

// ==================== COMBINED TOOL SETS ====================

export function getAllReservationTools(
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) {
  return [
    getCurrentDateTimeTool(webhookBaseUrl, restaurantId, agentId),
    searchReservationsTool(webhookBaseUrl, restaurantId, agentId),
    createReservationTool(webhookBaseUrl, restaurantId, agentId),
    editReservationTool(webhookBaseUrl, restaurantId, agentId),
    cancelReservationTool(webhookBaseUrl, restaurantId, agentId),
  ];
}

export function getAllOrderTools(
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) {
  return [
    getCurrentDateTimeTool(webhookBaseUrl, restaurantId, agentId),
    searchOrdersTool(webhookBaseUrl, restaurantId, agentId),
    createOrderTool(webhookBaseUrl, restaurantId, agentId),
    editOrderTool(webhookBaseUrl, restaurantId, agentId),
    cancelOrderTool(webhookBaseUrl, restaurantId, agentId),
  ];
}

export function getAllTools(
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) {
  return [
    getCurrentDateTimeTool(webhookBaseUrl, restaurantId, agentId),
    searchReservationsTool(webhookBaseUrl, restaurantId, agentId),
    createReservationTool(webhookBaseUrl, restaurantId, agentId),
    editReservationTool(webhookBaseUrl, restaurantId, agentId),
    cancelReservationTool(webhookBaseUrl, restaurantId, agentId),
    searchOrdersTool(webhookBaseUrl, restaurantId, agentId),
    createOrderTool(webhookBaseUrl, restaurantId, agentId),
    editOrderTool(webhookBaseUrl, restaurantId, agentId),
    cancelOrderTool(webhookBaseUrl, restaurantId, agentId),
  ];
}

/**
 * Get all tools with optional menu tool included
 * Use this when updating an agent to conditionally include the menu tool
 */
export function getAllToolsWithMenu(
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string,
  includeMenuTool: boolean = false
) {
  const baseTools = getAllTools(webhookBaseUrl, restaurantId, agentId);
  if (includeMenuTool) {
    return [...baseTools, getMenuTool(webhookBaseUrl, restaurantId, agentId)];
  }
  return baseTools;
}
