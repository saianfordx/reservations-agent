import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ============================================
  // USERS & AUTHENTICATION
  // ============================================

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.string(), // owner, admin
    subscriptionTier: v.string(), // free, pro, enterprise
    subscriptionStatus: v.string(), // active, cancelled, past_due
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  // ============================================
  // RESTAURANTS
  // ============================================

  restaurants: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    cuisine: v.optional(v.string()),
    location: v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      country: v.string(),
      zipCode: v.string(),
      timezone: v.string(),
    }),
    contact: v.object({
      email: v.string(),
      phone: v.string(),
      website: v.optional(v.string()),
    }),
    operatingHours: v.object({
      monday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      tuesday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      wednesday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      thursday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      friday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      saturday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
      sunday: v.object({
        isOpen: v.boolean(),
        open: v.optional(v.string()),
        close: v.optional(v.string()),
      }),
    }),
    settings: v.object({
      seatingCapacity: v.number(),
      avgTableTurnoverMinutes: v.number(),
      reservationBuffer: v.number(),
      maxPartySize: v.number(),
      minPartySize: v.number(),
      advanceBookingDays: v.number(),
      cancellationPolicy: v.optional(v.string()),
    }),
    status: v.string(), // active, paused, archived
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_status', ['status']),

  // ============================================
  // AI AGENTS (ElevenLabs)
  // ============================================

  agents: defineTable({
    restaurantId: v.id('restaurants'),
    ownerId: v.id('users'),

    // ElevenLabs IDs
    elevenLabsAgentId: v.string(),
    elevenLabsVoiceId: v.string(),
    phoneNumber: v.string(),

    // Agent Configuration
    name: v.string(),
    voiceName: v.string(),
    language: v.string(),

    // Agent Behavior Settings
    agentConfig: v.object({
      greeting: v.string(),
      conversationStyle: v.string(),
      maxConversationDuration: v.number(),
      enableVoicemail: v.boolean(),
      voicemailMessage: v.optional(v.string()),
    }),

    // Knowledge Base
    knowledgeBaseId: v.optional(v.string()),
    documents: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
        uploadedAt: v.number(),
        size: v.number(),
      })
    ),

    // Status & Metrics
    status: v.string(), // active, paused, configuring, error
    lastCallAt: v.optional(v.number()),
    totalCalls: v.number(),
    totalMinutes: v.number(),

    // Error Tracking
    lastError: v.optional(v.string()),
    errorCount: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_owner', ['ownerId'])
    .index('by_elevenlabs_agent_id', ['elevenLabsAgentId'])
    .index('by_phone_number', ['phoneNumber'])
    .index('by_status', ['status']),

  // ============================================
  // RESERVATIONS
  // ============================================

  reservations: defineTable({
    restaurantId: v.id('restaurants'),
    agentId: v.id('agents'),

    // Reservation ID (4-digit, unique per restaurant)
    reservationId: v.string(),

    // Customer Information
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),

    // Reservation Details
    date: v.string(), // YYYY-MM-DD
    time: v.string(), // HH:MM (24-hour)
    partySize: v.number(),

    // Additional Info
    specialRequests: v.optional(v.string()),
    tablePreference: v.optional(v.string()),
    occasion: v.optional(v.string()),

    // Status Management
    status: v.string(), // confirmed, cancelled, completed, no_show
    source: v.string(), // phone_agent, manual, online

    // Conversation Reference
    callId: v.optional(v.string()),
    conversationTranscript: v.optional(v.string()),

    // Change History
    history: v.array(
      v.object({
        action: v.string(),
        timestamp: v.number(),
        changes: v.optional(v.any()),
        modifiedBy: v.optional(v.string()),
      })
    ),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_restaurant_date', ['restaurantId', 'date'])
    .index('by_restaurant_status', ['restaurantId', 'status'])
    .index('by_reservation_id', ['restaurantId', 'reservationId'])
    .index('by_agent', ['agentId'])
    .index('by_customer_phone', ['customerPhone'])
    .index('by_status', ['status']),
});
