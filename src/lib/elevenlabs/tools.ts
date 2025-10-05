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
  description: 'Creates a new restaurant reservation with customer details',
  api_schema: {
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/create?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
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
  description: 'Modifies an existing reservation',
  api_schema: {
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/edit?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
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
  description: 'Cancels an existing reservation',
  api_schema: {
    url: `${webhookBaseUrl}/api/webhooks/elevenlabs/reservations/cancel?restaurantId=${restaurantId}&agentId=${agentId}`,
    method: 'POST',
    request_body_schema: {
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

export function getAllReservationTools(
  webhookBaseUrl: string,
  restaurantId: string,
  agentId: string
) {
  return [
    createReservationTool(webhookBaseUrl, restaurantId, agentId),
    editReservationTool(webhookBaseUrl, restaurantId, agentId),
    cancelReservationTool(webhookBaseUrl, restaurantId, agentId),
  ];
}
