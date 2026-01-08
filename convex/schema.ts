import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ============================================
  // USERS & AUTHENTICATION
  // ============================================

  users: defineTable({
    clerkId: v.optional(v.string()), // Made optional for data cleanup
    cognitoId: v.optional(v.string()), // Temporary for Cognito test data cleanup
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Deprecated fields (kept for migration)
    role: v.optional(v.string()),
    subscriptionTier: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  // ============================================
  // ORGANIZATIONS
  // ============================================

  organizations: defineTable({
    clerkOrganizationId: v.optional(v.string()), // Made optional for data cleanup
    organizationId: v.optional(v.string()), // Temporary for Cognito test data cleanup
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
    createdBy: v.id('users'),
    subscriptionTier: v.string(), // free, pro, enterprise
    subscriptionStatus: v.string(), // active, cancelled, past_due
    // Onboarding tracking
    onboardingStatus: v.optional(v.object({
      completed: v.boolean(),
      currentStep: v.optional(v.string()), // 'organization' | 'restaurant' | 'agent'
      hasRestaurant: v.boolean(),
      hasAgent: v.boolean(),
      completedAt: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_organization_id', ['clerkOrganizationId'])
    .index('by_slug', ['slug'])
    .index('by_created_by', ['createdBy']),

  organizationMemberships: defineTable({
    organizationId: v.id('organizations'),
    userId: v.id('users'),
    clerkOrganizationId: v.optional(v.string()), // Made optional for data cleanup
    clerkUserId: v.optional(v.string()), // Made optional for data cleanup
    // Temporary fields for Cognito test data cleanup
    cognitoUserId: v.optional(v.string()),
    externalOrgId: v.optional(v.string()),
    role: v.string(), // org:admin, org:member, or custom role (synced from Clerk)
    permissions: v.array(v.string()), // Array of permission strings (synced from Clerk)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['userId'])
    .index('by_organization_and_user', ['organizationId', 'userId'])
    .index('by_clerk_org_and_user', ['clerkOrganizationId', 'clerkUserId']),

  // ============================================
  // RESTAURANT ACCESS CONTROL
  // ============================================

  restaurantAccess: defineTable({
    restaurantId: v.id('restaurants'),
    userId: v.id('users'),
    organizationId: v.id('organizations'),
    role: v.string(), // restaurant:owner, restaurant:manager, restaurant:host, restaurant:viewer
    permissions: v.array(v.string()), // Granular permissions
    grantedBy: v.id('users'), // Who granted this access
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_user', ['userId'])
    .index('by_restaurant_and_user', ['restaurantId', 'userId'])
    .index('by_organization', ['organizationId'])
    .index('by_user_and_organization', ['userId', 'organizationId']),

  // ============================================
  // RESTAURANTS
  // ============================================

  restaurants: defineTable({
    organizationId: v.optional(v.id('organizations')), // Made optional for migration
    ownerId: v.optional(v.id('users')), // Deprecated, keeping for migration
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
      notificationEmails: v.optional(v.array(v.string())),
    }),
    status: v.string(), // active, paused, archived
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_owner', ['ownerId'])
    .index('by_status', ['status']),

  // ============================================
  // AI AGENTS (ElevenLabs)
  // ============================================

  agents: defineTable({
    restaurantId: v.id('restaurants'),
    organizationId: v.optional(v.id('organizations')), // Made optional for migration
    ownerId: v.optional(v.id('users')), // Deprecated, keeping for migration

    // ElevenLabs IDs
    elevenLabsAgentId: v.string(),
    elevenLabsVoiceId: v.string(), // Deprecated - use voiceSettings.primaryVoice.voiceId
    elevenLabsPhoneNumberId: v.optional(v.string()),
    phoneNumber: v.string(),

    // Agent Configuration
    name: v.string(),
    voiceName: v.string(), // Deprecated - use voiceSettings.primaryVoice.voiceName
    language: v.string(), // Deprecated - use languages.defaultLanguage
    prompt: v.optional(v.string()), // Agent's system prompt/instructions

    // Language Settings
    languages: v.optional(v.object({
      defaultLanguage: v.string(), // 'en', 'es', etc.
      additionalLanguages: v.array(v.string()),
    })),

    // Voice Settings (expanded)
    voiceSettings: v.optional(v.object({
      primaryVoice: v.object({
        voiceId: v.string(),
        voiceName: v.string(),
        language: v.string(),
        stability: v.number(), // 0-1
        speed: v.number(), // 0.5-2
        similarityBoost: v.number(), // 0-1
      }),
      additionalVoices: v.array(v.object({
        voiceId: v.string(),
        voiceName: v.string(),
        voiceLabel: v.string(), // e.g., "English Voice"
        language: v.string(),
        stability: v.number(),
        speed: v.number(),
        similarityBoost: v.number(),
      })),
      ttsModelId: v.string(), // 'eleven_flash_v2', 'eleven_turbo_v2', etc.
    })),

    // LLM Settings
    llmSettings: v.optional(v.object({
      provider: v.string(), // 'openai', 'anthropic', 'google', 'custom'
      model: v.string(), // 'gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash', etc.
      temperature: v.number(), // 0-1
      reasoningEffort: v.optional(v.string()), // 'none', 'low', 'medium', 'high'
      maxTokens: v.number(), // -1 for unlimited
      backupLlm: v.optional(v.object({
        enabled: v.boolean(),
        model: v.string(),
      })),
    })),

    // Conversational Behavior
    conversationBehavior: v.optional(v.object({
      eagerness: v.string(), // 'patient', 'normal', 'eager'
      turnTimeout: v.number(), // seconds
      silenceEndCallTimeout: v.number(), // -1 for disabled
      maxDuration: v.number(), // seconds
      softTimeout: v.optional(v.object({
        enabled: v.boolean(),
        timeoutSeconds: v.number(),
        message: v.string(),
      })),
    })),

    // First Message Settings
    firstMessageSettings: v.optional(v.object({
      defaultMessage: v.string(),
      interruptible: v.boolean(),
      translateToAll: v.boolean(),
      perLanguageMessages: v.optional(v.array(v.object({
        language: v.string(),
        message: v.string(),
      }))),
    })),

    // Audio Settings
    audioSettings: v.optional(v.object({
      userInputFormat: v.string(), // 'pcm_16000', 'pcm_8000', 'ulaw_8000'
      agentOutputFormat: v.optional(v.string()),
    })),

    // Agent Behavior Settings (deprecated - use conversationBehavior)
    agentConfig: v.object({
      greeting: v.string(),
      conversationStyle: v.string(),
      maxConversationDuration: v.number(),
      enableVoicemail: v.boolean(),
      voicemailMessage: v.optional(v.string()),
    }),

    // Knowledge Base (deprecated - use knowledgeBaseItems table)
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
    .index('by_organization', ['organizationId'])
    .index('by_elevenlabs_agent_id', ['elevenLabsAgentId'])
    .index('by_phone_number', ['phoneNumber'])
    .index('by_status', ['status']),

  // Knowledge Base Items - maps ElevenLabs knowledge base items to organizations
  knowledgeBaseItems: defineTable({
    organizationId: v.id('organizations'),
    elevenLabsFileId: v.string(), // ID from ElevenLabs
    name: v.string(),
    type: v.string(), // 'document' or 'text'
    content: v.optional(v.string()), // For text type items
    fileUrl: v.optional(v.string()), // For document type items (if needed)
    fileSize: v.optional(v.number()), // File size in bytes
    mimeType: v.optional(v.string()), // e.g., 'text/plain', 'application/pdf'
    uploadedBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_elevenlabs_file_id', ['elevenLabsFileId'])
    .index('by_organization_and_type', ['organizationId', 'type']),

  // Agent Knowledge Base Mapping - links agents to their knowledge base items
  agentKnowledgeBase: defineTable({
    agentId: v.id('agents'),
    knowledgeBaseItemId: v.id('knowledgeBaseItems'),
    addedAt: v.number(),
  })
    .index('by_agent', ['agentId'])
    .index('by_knowledge_item', ['knowledgeBaseItemId'])
    .index('by_agent_and_item', ['agentId', 'knowledgeBaseItemId']),

  // Agent Tools Configuration - tracks enabled tools per agent
  agentTools: defineTable({
    agentId: v.id('agents'),
    toolName: v.string(), // 'menu', etc.
    enabled: v.boolean(),
    config: v.optional(v.object({
      integrationProvider: v.optional(v.string()), // 'the_account'
    })),
    enabledAt: v.optional(v.number()),
    enabledBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_agent', ['agentId'])
    .index('by_agent_tool', ['agentId', 'toolName']),

  // ============================================
  // RESERVATIONS
  // ============================================

  reservations: defineTable({
    restaurantId: v.id('restaurants'),
    agentId: v.optional(v.id('agents')), // Optional for manual reservations

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

  // ============================================
  // TO-GO ORDERS
  // ============================================

  orders: defineTable({
    restaurantId: v.id('restaurants'),
    agentId: v.optional(v.id('agents')), // Optional for manual orders

    // Order ID (4-digit, unique per restaurant)
    orderId: v.string(),

    // Customer Information (required)
    customerName: v.string(),
    customerPhone: v.string(), // Required for to-go orders

    // Order Details
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        specialInstructions: v.optional(v.string()),
      })
    ),
    orderNotes: v.optional(v.string()),

    // Pickup Information
    pickupTime: v.optional(v.string()), // HH:MM (24-hour)
    pickupDate: v.optional(v.string()), // YYYY-MM-DD (defaults to today if not specified)

    // Status Management
    status: v.string(), // pending, confirmed, preparing, ready, completed, cancelled
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
    .index('by_restaurant_date', ['restaurantId', 'pickupDate'])
    .index('by_restaurant_status', ['restaurantId', 'status'])
    .index('by_order_id', ['restaurantId', 'orderId'])
    .index('by_agent', ['agentId'])
    .index('by_customer_phone', ['customerPhone'])
    .index('by_status', ['status']),

  // ============================================
  // INTEGRATIONS
  // ============================================

  integrations: defineTable({
    restaurantId: v.id('restaurants'),
    provider: v.string(), // 'the_account', 'toast', 'square', etc.

    // The Account specific fields
    tenantSlug: v.optional(v.string()), // e.g., 'tacos-el-rey'
    apiKey: v.optional(v.string()), // e.g., 'po_d7b878...'

    // Status tracking
    status: v.string(), // 'connected', 'disconnected', 'error'
    lastTestedAt: v.optional(v.number()),
    lastTestResult: v.optional(v.string()), // 'success' or error message

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id('users'),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_restaurant_provider', ['restaurantId', 'provider']),
});
