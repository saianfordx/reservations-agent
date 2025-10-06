/**
 * ElevenLabs Tool Definitions for Reservation Management
 */

export const createReservationTool = (
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) => ({
  type: 'webhook' as const,
  name: 'create_reservation',
  description: 'Creates a new restaurant reservation with customer details. Call this function after collecting all required information from the customer.',
  api_schema: {
    description: 'This endpoint creates a new reservation in the restaurant system. It will return a confirmation message with a 4-digit reservation ID that you should provide to the customer.',
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/create?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
      description: 'Extract reservation details from the conversation. Collect the customer\'s full name, preferred date and time, party size, and optionally their phone number and any special requests.',
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
          description: 'Customer phone number (optional)',
        },
        special_requests: {
          type: 'string',
          description: 'Any special requests or dietary restrictions (optional)',
        },
      },
      required: ['customer_name', 'date', 'time', 'party_size'],
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
