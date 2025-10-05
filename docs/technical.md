# Restaurant AI Agent Platform - Complete Technical Specification

## Document Version: 1.0
**Last Updated:** October 4, 2025  
**Project Codename:** VoiceAgent  
**Target Launch:** Phase 1 MVP in 4 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision & Objectives](#product-vision--objectives)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [ElevenLabs Integration Architecture](#elevenlabs-integration-architecture)
6. [Feature Specifications](#feature-specifications)
7. [API Integrations](#api-integrations)
8. [UI/UX Requirements](#uiux-requirements)
9. [Implementation Phases](#implementation-phases)
10. [Code Structure & Organization](#code-structure--organization)
11. [Testing Requirements](#testing-requirements)
12. [Deployment & Infrastructure](#deployment--infrastructure)
13. [Security & Privacy](#security--privacy)
14. [Performance Requirements](#performance-requirements)
15. [Success Metrics](#success-metrics)

---

## Executive Summary

Restaurant AI Agent Platform is a multi-tenant SaaS solution that enables restaurant owners to create AI-powered phone agents using ElevenLabs API. Each agent handles reservations and provides restaurant information through natural voice conversations.

### Core Value Proposition

Restaurant owners can:
- Create dedicated AI agents for each restaurant location in under 5 minutes
- Handle reservations 24/7 without human intervention (create, edit, cancel)
- Provide instant information about menu, hours, and policies via phone
- Track conversation minutes and agent usage for billing
- Manage multiple restaurants from a single account

### Key Differentiators

1. **ElevenLabs-First:** Leverage all ElevenLabs capabilities to minimize custom development
2. **Zero Training Required:** Upload documents, select voice, go live
3. **Specialized Agents:** Each agent is an expert on one specific restaurant
4. **Complete Automation:** Reservations fully managed without staff involvement

---

## Product Vision & Objectives

### Primary Goals

1. **Reduce Missed Reservations:** Answer every call 24/7
2. **Save Labor Costs:** Eliminate need for dedicated reservation staff
3. **Improve Customer Experience:** Instant answers, no hold times
4. **Enable Scaling:** One account can manage unlimited restaurant locations

### Target Users

- **Primary:** Restaurant Owners (1-5 locations)
- **Secondary:** Restaurant Groups/Chains (10+ locations)
- **Personas:**
  - Solo owner managing one high-end restaurant
  - Owner with 3-5 casual dining locations
  - Restaurant group managing 20+ franchises

### Success Criteria

- Agent setup completed in under 5 minutes
- 95%+ reservation accuracy (all required fields captured)
- Zero human intervention needed for standard reservations
- Users create 2+ agents within first month

---

## Technical Architecture

### Tech Stack

```
Frontend:
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- FullCalendar (calendar view)

Backend:
- Convex (database + backend functions)
- Node.js runtime

AI/Voice:
- ElevenLabs Conversational AI API (primary voice agent)
- ElevenLabs Voice Library API (voice selection)
- ElevenLabs RAG API (document knowledge base)
- ElevenLabs Phone API (call handling)
- ElevenLabs Analytics API (usage tracking)

Authentication:
- Clerk (user management)

Deployment:
- Vercel (frontend + API routes)
- Convex Cloud (backend + database)
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  User Interface (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Agents  │  │Calendar  │  │  Usage   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Next.js API Routes)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Create  │  │ Configure│  │Webhooks  │  │Analytics │   │
│  │  Agent   │  │   Agent  │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Database Tables                      │  │
│  │  restaurants | agents | reservations | documents     │  │
│  │              usage | phoneNumbers                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Convex Actions & Queries                 │  │
│  │  Agent Management | Reservation CRUD | Analytics     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  ElevenLabs Platform                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Conversati│  │  Voice   │  │   RAG    │  │  Phone   │   │
│  │ onal AI  │  │ Library  │  │(Docs)    │  │  Calls   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
              │                │                 │
              ▼                ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Customer   │  │   Customer   │  │   Customer   │
    │   Calls      │  │   Calls      │  │   Calls      │
    │ Restaurant A │  │ Restaurant B │  │ Restaurant C │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### Data Flow

```
1. RESTAURANT OWNER CREATES ACCOUNT
   ↓
2. CREATES FIRST AGENT
   - Enters restaurant details (name, hours, location)
   - Uploads menu/documents (stored in ElevenLabs RAG)
   - Selects voice from ElevenLabs library
   - System provisions phone number via ElevenLabs
   ↓
3. ELEVENLABS AGENT CONFIGURATION
   - Create agent instance via ElevenLabs API
   - Upload knowledge base documents
   - Configure agent behavior for reservations
   - Assign phone number
   - Store agent metadata in Convex
   ↓
4. AGENT GOES LIVE
   - Customer calls phone number
   - ElevenLabs handles call routing
   - Agent handles conversation
   - For reservations: agent calls webhook to store in Convex
   ↓
5. RESERVATION MANAGEMENT
   - Webhook receives reservation from ElevenLabs
   - Validate and store in Convex database
   - Generate 4-digit reservation ID
   - Update calendar view
   - Return confirmation to agent/caller
   ↓
6. USAGE TRACKING
   - ElevenLabs tracks conversation minutes
   - Periodic sync via Analytics API
   - Store usage data in Convex
   - Display in dashboard for billing
   ↓
7. ONGOING MANAGEMENT
   - Owner views calendar of reservations
   - Monitors usage/costs
   - Updates restaurant info (syncs to ElevenLabs)
   - Creates additional agents for new locations
```

---

## Database Schema

### Complete Convex Schema Definition

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
  }).index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // ============================================
  // RESTAURANTS
  // ============================================

  restaurants: defineTable({
    ownerId: v.id("users"),
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
        close: v.optional(v.string()) 
      }),
      tuesday: v.object({ 
        isOpen: v.boolean(),
        open: v.optional(v.string()), 
        close: v.optional(v.string()) 
      }),
      wednesday: v.object({ 
        isOpen: v.boolean(),
        open: v.optional(v.string()), 
        close: v.optional(v.string()) 
      }),
      thursday: v.object({ 
        isOpen: v.boolean(),
        open: v.optional(v.string()), 
        close: v.optional(v.string()) 
      }),
      friday: v.object({ 
        isOpen: v.boolean(),
        open: v.optional(v.string()), 
        close: v.optional(v.string()) 
      }),
      saturday: v.object({ 
        isOpen: v.boolean(),
        open: v.optional(v.string()), 
        close: v.optional(v.string()) 
      }),
      sunday: v.object({ 
        isOpen: v.boolean(),
        open: v.optional(v.string()), 
        close: v.optional(v.string()) 
      }),
    }),
    settings: v.object({
      seatingCapacity: v.number(),
      avgTableTurnoverMinutes: v.number(),
      reservationBuffer: v.number(), // minutes between reservations
      maxPartySize: v.number(),
      minPartySize: v.number(),
      advanceBookingDays: v.number(), // how far ahead to allow bookings
      cancellationPolicy: v.optional(v.string()),
    }),
    status: v.string(), // active, paused, archived
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  // ============================================
  // AI AGENTS (ElevenLabs)
  // ============================================

  agents: defineTable({
    restaurantId: v.id("restaurants"),
    ownerId: v.id("users"),
    
    // ElevenLabs IDs
    elevenLabsAgentId: v.string(), // ID from ElevenLabs
    elevenLabsVoiceId: v.string(), // Selected voice
    phoneNumber: v.string(), // Provisioned phone number
    
    // Agent Configuration
    name: v.string(), // e.g., "Downtown Bistro Agent"
    voiceName: v.string(), // Display name of voice
    language: v.string(), // en-US, es-ES, etc.
    
    // Agent Behavior Settings
    agentConfig: v.object({
      greeting: v.string(), // Custom greeting message
      conversationStyle: v.string(), // professional, friendly, casual
      maxConversationDuration: v.number(), // seconds
      enableVoicemail: v.boolean(),
      voicemailMessage: v.optional(v.string()),
    }),
    
    // Knowledge Base
    knowledgeBaseId: v.optional(v.string()), // ElevenLabs RAG knowledge base ID
    documents: v.array(v.object({
      id: v.string(), // Document ID in ElevenLabs
      name: v.string(),
      type: v.string(), // menu, policies, faq
      uploadedAt: v.number(),
      size: v.number(),
    })),
    
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
  }).index("by_restaurant", ["restaurantId"])
    .index("by_owner", ["ownerId"])
    .index("by_elevenlabs_agent_id", ["elevenLabsAgentId"])
    .index("by_phone_number", ["phoneNumber"])
    .index("by_status", ["status"]),

  // ============================================
  // RESERVATIONS
  // ============================================

  reservations: defineTable({
    restaurantId: v.id("restaurants"),
    agentId: v.id("agents"),
    
    // Reservation ID (4-digit, unique per restaurant)
    reservationId: v.string(), // e.g., "0001", "9999"
    
    // Customer Information
    customerName: v.string(), // Full name (required)
    customerPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    
    // Reservation Details
    date: v.string(), // YYYY-MM-DD
    time: v.string(), // HH:MM (24-hour format)
    partySize: v.number(), // Number of guests (required)
    
    // Additional Info
    specialRequests: v.optional(v.string()),
    tablePreference: v.optional(v.string()), // window, patio, etc.
    occasion: v.optional(v.string()), // birthday, anniversary, etc.
    
    // Status Management
    status: v.string(), // confirmed, cancelled, completed, no_show
    source: v.string(), // phone_agent, manual, online
    
    // Conversation Reference
    callId: v.optional(v.string()), // ElevenLabs call ID if from agent
    conversationTranscript: v.optional(v.string()),
    
    // Change History
    history: v.array(v.object({
      action: v.string(), // created, modified, cancelled
      timestamp: v.number(),
      changes: v.optional(v.any()),
      modifiedBy: v.optional(v.string()), // agent or user
    })),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_date", ["restaurantId", "date"])
    .index("by_restaurant_status", ["restaurantId", "status"])
    .index("by_reservation_id", ["restaurantId", "reservationId"])
    .index("by_agent", ["agentId"])
    .index("by_customer_phone", ["customerPhone"])
    .index("by_status", ["status"]),

  // ============================================
  // USAGE TRACKING & BILLING
  // ============================================

  usage: defineTable({
    agentId: v.id("agents"),
    restaurantId: v.id("restaurants"),
    ownerId: v.id("users"),
    
    // Period (for aggregation)
    period: v.string(), // YYYY-MM (monthly billing)
    periodStart: v.number(),
    periodEnd: v.number(),
    
    // Usage Metrics
    totalCalls: v.number(),
    totalMinutes: v.number(), // Conversation minutes
    successfulReservations: v.number(),
    failedReservations: v.number(),
    
    // Cost Calculation
    minuteRate: v.float64(), // Cost per minute
    totalCost: v.float64(), // Calculated cost
    
    // Detailed Call Log
    calls: v.array(v.object({
      callId: v.string(),
      timestamp: v.number(),
      duration: v.number(), // seconds
      outcome: v.string(), // reservation_created, information_only, error
      reservationId: v.optional(v.string()),
    })),
    
    // Sync Status
    lastSyncedAt: v.number(),
    syncedFromElevenLabs: v.boolean(),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_owner", ["ownerId"])
    .index("by_period", ["period"])
    .index("by_restaurant_period", ["restaurantId", "period"]),

  // ============================================
  // PHONE NUMBERS (Inventory)
  // ============================================

  phoneNumbers: defineTable({
    number: v.string(), // E.164 format
    country: v.string(),
    areaCode: v.string(),
    
    // Assignment
    agentId: v.optional(v.id("agents")),
    restaurantId: v.optional(v.id("restaurants")),
    
    // ElevenLabs Reference
    elevenLabsPhoneId: v.string(),
    
    // Status
    status: v.string(), // available, assigned, reserved, released
    
    // Provisioning
    provisionedAt: v.number(),
    assignedAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_number", ["number"])
    .index("by_status", ["status"])
    .index("by_agent", ["agentId"])
    .index("by_elevenlabs_phone_id", ["elevenLabsPhoneId"]),

  // ============================================
  // WEBHOOKS (ElevenLabs Events)
  // ============================================

  webhookEvents: defineTable({
    eventId: v.string(), // ElevenLabs event ID
    eventType: v.string(), // call.started, call.ended, reservation.created, etc.
    agentId: v.optional(v.id("agents")),
    restaurantId: v.optional(v.id("restaurants")),
    
    // Payload
    payload: v.any(), // Full webhook payload
    
    // Processing
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    
    createdAt: v.number(),
  }).index("by_event_id", ["eventId"])
    .index("by_event_type", ["eventType"])
    .index("by_processed", ["processed"])
    .index("by_agent", ["agentId"]),

  // ============================================
  // DOCUMENTS (Knowledge Base)
  // ============================================

  documents: defineTable({
    restaurantId: v.id("restaurants"),
    agentId: v.optional(v.id("agents")),
    
    // File Information
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(), // pdf, txt, docx
    
    // ElevenLabs Reference
    elevenLabsDocumentId: v.string(),
    
    // Document Type
    type: v.string(), // menu, policies, faq, general
    category: v.optional(v.string()),
    
    // Content
    title: v.string(),
    description: v.optional(v.string()),
    
    // Status
    status: v.string(), // uploading, processing, active, failed
    processingError: v.optional(v.string()),
    
    // Storage
    storageUrl: v.optional(v.string()), // If we also store in Convex storage
    
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    lastModifiedAt: v.number(),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_agent", ["agentId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_elevenlabs_document_id", ["elevenLabsDocumentId"]),

  // ============================================
  // ACTIVITY LOG
  // ============================================

  activityLog: defineTable({
    userId: v.id("users"),
    restaurantId: v.optional(v.id("restaurants")),
    agentId: v.optional(v.id("agents")),
    
    // Activity Details
    action: v.string(), // agent_created, reservation_created, document_uploaded, etc.
    description: v.string(),
    metadata: v.optional(v.any()),
    
    // IP & User Agent
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_agent", ["agentId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),
});
```

---

## ElevenLabs Integration Architecture

### 1. Agent Lifecycle Management

```typescript
// convex/elevenlabs/agentManagement.ts

/**
 * Complete flow for creating and configuring an ElevenLabs agent
 */

// Step 1: Create Agent Instance
export const createAgent = internalAction({
  args: {
    restaurantId: v.id("restaurants"),
    voiceId: v.string(),
    config: v.object({
      greeting: v.string(),
      conversationStyle: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Call ElevenLabs Conversational AI API
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Restaurant Agent ${args.restaurantId}`,
        voice_id: args.voiceId,
        conversation_config: {
          agent: {
            prompt: {
              prompt: generateAgentPrompt(args.config),
            },
            first_message: args.config.greeting,
          },
        },
      }),
    });

    const agent = await response.json();
    return agent.agent_id;
  },
});

// Step 2: Configure Reservation Function
export const configureReservationTool = internalAction({
  args: {
    agentId: v.string(),
    webhookUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Add custom function/tool to agent for handling reservations
    await fetch(`https://api.elevenlabs.io/v1/convai/agents/${args.agentId}/tools`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'webhook',
        name: 'create_reservation',
        description: 'Creates a restaurant reservation',
        webhook_url: args.webhookUrl,
        parameters: {
          customer_name: { type: 'string', required: true },
          date: { type: 'string', required: true },
          time: { type: 'string', required: true },
          party_size: { type: 'number', required: true },
          phone: { type: 'string', required: false },
          special_requests: { type: 'string', required: false },
        },
      }),
    });
  },
});

// Step 3: Upload Knowledge Base
export const uploadKnowledgeBase = internalAction({
  args: {
    agentId: v.string(),
    documents: v.array(v.object({
      content: v.string(),
      name: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Upload documents to ElevenLabs RAG
    for (const doc of args.documents) {
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${args.agentId}/knowledge-base`, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_name: doc.name,
          document_content: doc.content,
        }),
      });
    }
  },
});

// Step 4: Provision Phone Number
export const provisionPhoneNumber = internalAction({
  args: {
    agentId: v.string(),
    countryCode: v.string(), // e.g., "US"
    areaCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Request phone number from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/phone-numbers', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country: args.countryCode,
        area_code: args.areaCode,
      }),
    });

    const { phone_number, phone_number_id } = await response.json();

    // Assign to agent
    await fetch(`https://api.elevenlabs.io/v1/convai/agents/${args.agentId}/phone`, {
      method: 'PUT',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number_id,
      }),
    });

    return { phoneNumber: phone_number, phoneNumberId: phone_number_id };
  },
});
```

### 2. Reservation Management via Webhooks

```typescript
// app/api/webhooks/elevenlabs/reservations/route.ts

/**
 * Webhook endpoint for ElevenLabs to call when creating/modifying reservations
 */

export async function POST(req: Request) {
  // Verify webhook signature
  const signature = req.headers.get('x-elevenlabs-signature');
  if (!verifyWebhookSignature(signature, await req.text())) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = await req.json();
  const { agent_id, action, parameters } = body;

  // Get agent from database
  const agent = await convex.query(api.agents.getByElevenLabsId, {
    elevenLabsAgentId: agent_id,
  });

  if (!agent) {
    return new Response('Agent not found', { status: 404 });
  }

  switch (action) {
    case 'create_reservation':
      return await handleCreateReservation(agent, parameters);
    
    case 'edit_reservation':
      return await handleEditReservation(agent, parameters);
    
    case 'cancel_reservation':
      return await handleCancelReservation(agent, parameters);
    
    default:
      return new Response('Unknown action', { status: 400 });
  }
}

async function handleCreateReservation(agent: any, params: any) {
  // Generate 4-digit reservation ID
  const reservationId = await generateReservationId(agent.restaurantId);

  // Create reservation
  const reservation = await convex.mutation(api.reservations.create, {
    restaurantId: agent.restaurantId,
    agentId: agent._id,
    reservationId,
    customerName: params.customer_name,
    date: params.date,
    time: params.time,
    partySize: params.party_size,
    customerPhone: params.phone,
    specialRequests: params.special_requests,
    status: 'confirmed',
    source: 'phone_agent',
  });

  // Return confirmation to agent
  return Response.json({
    success: true,
    message: `Reservation confirmed for ${params.customer_name} on ${params.date} at ${params.time} for ${params.party_size} guests. Your reservation ID is ${reservationId}.`,
    reservation_id: reservationId,
  });
}
```

### 3. Usage Tracking & Analytics

```typescript
// convex/elevenlabs/analytics.ts

/**
 * Sync usage data from ElevenLabs Analytics API
 */

export const syncUsageData = internalAction({
  args: {
    agentId: v.id("agents"),
    period: v.string(), // "2025-10"
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.get, { id: args.agentId });
    
    // Fetch analytics from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}/analytics?period=${args.period}`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    const analytics = await response.json();

    // Store in database
    await ctx.runMutation(api.usage.upsert, {
      agentId: args.agentId,
      restaurantId: agent.restaurantId,
      ownerId: agent.ownerId,
      period: args.period,
      totalCalls: analytics.total_calls,
      totalMinutes: analytics.total_minutes,
      calls: analytics.calls.map((call: any) => ({
        callId: call.id,
        timestamp: call.timestamp,
        duration: call.duration,
        outcome: call.outcome,
      })),
      lastSyncedAt: Date.now(),
      syncedFromElevenLabs: true,
    });
  },
});

// Scheduled job to sync usage daily
export const scheduledUsageSync = internalAction({
  handler: async (ctx) => {
    const agents = await ctx.runQuery(api.agents.listActive);
    const currentPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    for (const agent of agents) {
      await ctx.runAction(api.elevenlabs.analytics.syncUsageData, {
        agentId: agent._id,
        period: currentPeriod,
      });
    }
  },
});
```

---

## Feature Specifications

### Feature 1: Agent Creation Wizard

**User Story:**  
As a restaurant owner, I want to create an AI agent for my restaurant in under 5 minutes.

**Steps:**

1. **Restaurant Information** (1 minute)
   - Name, cuisine type, location
   - Operating hours (visual time picker)
   - Contact information
   - Seating capacity & policies

2. **Voice Selection** (1 minute)
   - Display grid of available ElevenLabs voices
   - Play voice samples
   - Filter by: language, gender, accent, age
   - Preview greeting with selected voice

3. **Knowledge Base Upload** (2 minutes)
   - Drag & drop menu PDF
   - Upload policies document (optional)
   - Upload FAQ (optional)
   - Preview uploaded documents
   - Auto-extraction of key info

4. **Review & Launch** (1 minute)
   - Summary of configuration
   - Test call simulation
   - Confirm and create agent
   - Phone number provisioned
   - Agent goes live

**UI Components:**
```
/dashboard/agents/create
- Step indicator (1/4, 2/4, etc.)
- RestaurantInfoForm
- VoiceSelector (grid with audio players)
- DocumentUploader (drag & drop)
- ReviewSummary
- TestCallSimulator
```

**Implementation Files:**
- `app/dashboard/agents/create/page.tsx`
- `features/agents/components/CreateAgentWizard.tsx`
- `features/agents/components/RestaurantInfoForm.tsx`
- `features/agents/components/VoiceSelector.tsx`
- `features/agents/components/DocumentUploader.tsx`
- `features/agents/components/ReviewSummary.tsx`
- `convex/agents.ts`
- `convex/elevenlabs/agentManagement.ts`

---

### Feature 2: Reservation Calendar

**User Story:**  
As a restaurant manager, I want to see all reservations in a clean calendar view.

**Calendar Features:**

- **Views:**
  - Day view (hourly slots)
  - Week view
  - Month view (compact)

- **Reservation Cards:**
  - Reservation ID (4-digit, prominent)
  - Customer name
  - Party size
  - Time
  - Special requests (icon if present)
  - Status badge (confirmed, cancelled, completed)
  - Quick actions (view, edit, cancel)

- **Interactions:**
  - Click reservation → Full details modal
  - Drag & drop to reschedule (with confirmation)
  - Click empty slot → Manual reservation form
  - Filter by status
  - Search by name or reservation ID

- **Real-time Updates:**
  - New reservations appear immediately
  - Visual notification when agent creates reservation
  - Sync status indicator

**UI Components:**
```
/dashboard/restaurants/[id]/calendar
- CalendarView (FullCalendar integration)
- ReservationCard
- ReservationDetailModal
- ManualReservationForm
- FilterBar
- SearchBox
```

**Implementation Files:**
- `app/dashboard/restaurants/[id]/calendar/page.tsx`
- `features/reservations/components/CalendarView.tsx`
- `features/reservations/components/ReservationCard.tsx`
- `features/reservations/components/ReservationDetail.tsx`
- `features/reservations/hooks/useReservations.ts`
- `convex/reservations.ts`

---

### Feature 3: Agent Management Dashboard

**User Story:**  
As a restaurant owner with multiple locations, I want to manage all my agents from one place.

**Dashboard Sections:**

1. **Agent List**
   - Card view of all agents
   - Restaurant name
   - Phone number (click to copy)
   - Status (active, paused, error)
   - Quick stats (calls today, minutes this month)
   - Quick actions (pause, configure, view usage)

2. **Agent Details**
   - Configuration overview
   - Knowledge base documents
   - Voice settings
   - Phone number
   - Operating status
   - Recent activity
   - Edit buttons for each section

3. **Usage Summary**
   - Total minutes this month (all agents)
   - Total calls this month
   - Cost breakdown
   - Usage chart (daily/weekly)
   - Per-agent breakdown

**UI Components:**
```
/dashboard/agents
- AgentsList
- AgentCard
- AgentDetailView
- UsageSummary
- UsageChart
- ConfigurationPanel
```

**Implementation Files:**
- `app/dashboard/agents/page.tsx`
- `app/dashboard/agents/[id]/page.tsx`
- `features/agents/components/AgentsList.tsx`
- `features/agents/components/AgentCard.tsx`
- `features/agents/components/AgentDetail.tsx`
- `features/agents/components/UsageSummary.tsx`
- `convex/agents.ts`

---

### Feature 4: Document Management

**User Story:**  
As a restaurant owner, I want to update my menu and policies without recreating the agent.

**Features:**

- **Document Library**
  - List of all uploaded documents per restaurant
  - Document type badges (menu, policies, FAQ)
  - Upload date & size
  - Status (active, processing, failed)
  - Preview capability
  - Replace/delete actions

- **Upload Interface**
  - Drag & drop
  - File type validation (PDF, TXT, DOCX)
  - Size limit (10MB per file)
  - Type selection dropdown
  - Progress indicator
  - Auto-sync to ElevenLabs

- **Version Control**
  - Keep history of replaced documents
  - Restore previous version
  - Compare versions (text diff)

**UI Components:**
```
/dashboard/restaurants/[id]/documents
- DocumentLibrary
- DocumentCard
- DocumentUploader
- DocumentPreview
- VersionHistory
```

**Implementation Files:**
- `app/dashboard/restaurants/[id]/documents/page.tsx`
- `features/documents/components/DocumentLibrary.tsx`
- `features/documents/components/DocumentUploader.tsx`
- `features/documents/hooks/useDocuments.ts`
- `convex/documents.ts`
- `convex/elevenlabs/knowledgeBase.ts`

---

### Feature 5: Reservation Management

**User Story:**  
As a restaurant host, I want to manually manage reservations (create, edit, cancel).

**Actions:**

1. **Create Reservation**
   - Form with all required fields
   - Date & time picker (respects operating hours)
   - Party size selector (respects min/max)
   - Customer information
   - Special requests
   - Auto-generate reservation ID
   - Check for conflicts (double bookings)

2. **Edit Reservation**
   - Load existing reservation
   - Allow changes to date, time, party size
   - Track change history
   - Send confirmation (if email/phone available)

3. **Cancel Reservation**
   - Confirmation dialog
   - Cancellation reason (optional)
   - Update status
   - Track in history

**UI Components:**
```
/dashboard/reservations/create
/dashboard/reservations/[id]/edit
- ReservationForm
- DateTimePicker
- PartySizeSelector
- CustomerInfoForm
- ConflictChecker
- ConfirmationDialog
```

**Implementation Files:**
- `app/dashboard/reservations/create/page.tsx`
- `app/dashboard/reservations/[id]/edit/page.tsx`
- `features/reservations/components/ReservationForm.tsx`
- `features/reservations/components/ConflictChecker.tsx`
- `convex/reservations.ts`

---

## API Integrations

### ElevenLabs API Endpoints

#### 1. Conversational AI API

**Create Agent:**
```typescript
POST https://api.elevenlabs.io/v1/convai/agents
Headers:
  xi-api-key: YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "name": "Restaurant Agent",
  "voice_id": "voice_id_here",
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": "You are a professional restaurant reservation assistant..."
      },
      "first_message": "Thank you for calling [Restaurant Name]. How may I help you today?"
    }
  }
}

Response:
{
  "agent_id": "agent_id_here",
  "name": "Restaurant Agent",
  "voice_id": "voice_id_here"
}
```

#### 2. Voice Library API

**List Voices:**
```typescript
GET https://api.elevenlabs.io/v1/voices
Headers:
  xi-api-key: YOUR_API_KEY

Response:
{
  "voices": [
    {
      "voice_id": "voice_1",
      "name": "Rachel",
      "category": "professional",
      "labels": {
        "accent": "american",
        "gender": "female",
        "age": "young"
      },
      "preview_url": "https://..."
    }
  ]
}
```

#### 3. RAG / Knowledge Base API

**Upload Document:**
```typescript
POST https://api.elevenlabs.io/v1/convai/agents/{agent_id}/knowledge-base
Headers:
  xi-api-key: YOUR_API_KEY
  Content-Type: multipart/form-data

Body:
  file: (binary)
  document_name: "menu.pdf"
  document_type: "menu"

Response:
{
  "document_id": "doc_id_here",
  "status": "processing"
}
```

#### 4. Phone API

**Provision Number:**
```typescript
POST https://api.elevenlabs.io/v1/phone-numbers
Headers:
  xi-api-key: YOUR_API_KEY

Body:
{
  "country": "US",
  "area_code": "415"
}

Response:
{
  "phone_number_id": "phone_id_here",
  "phone_number": "+14155551234"
}
```

**Assign to Agent:**
```typescript
PUT https://api.elevenlabs.io/v1/convai/agents/{agent_id}/phone
Headers:
  xi-api-key: YOUR_API_KEY

Body:
{
  "phone_number_id": "phone_id_here"
}
```

#### 5. Analytics API

**Get Usage:**
```typescript
GET https://api.elevenlabs.io/v1/convai/agents/{agent_id}/analytics?period=2025-10
Headers:
  xi-api-key: YOUR_API_KEY

Response:
{
  "total_calls": 150,
  "total_minutes": 450.5,
  "calls": [
    {
      "id": "call_123",
      "timestamp": 1728000000,
      "duration": 180,
      "outcome": "reservation_created"
    }
  ]
}
```

---

## UI/UX Requirements

### Design System

**Color Palette:**
```css
/* Primary Colors */
--primary-600: #4F46E5;  /* Indigo */
--primary-500: #6366F1;
--primary-400: #818CF8;

/* Status Colors */
--success-600: #059669;  /* Green */
--warning-600: #D97706;  /* Amber */
--danger-600: #DC2626;   /* Red */

/* Neutral */
--slate-900: #0F172A;
--slate-700: #334155;
--slate-500: #64748B;
--slate-300: #CBD5E1;
--slate-100: #F1F5F9;
```

**Component Library:** shadcn/ui + Lucide Icons

**Key UI Patterns:**

1. **Empty States**
   - Illustration
   - Clear heading
   - Brief description
   - Primary action button
   - Example: "No agents yet. Create your first AI agent in under 5 minutes."

2. **Loading States**
   - Skeleton screens for lists
   - Spinner for actions
   - Progress bars for uploads
   - Optimistic updates where possible

3. **Error States**
   - Error icon
   - Clear error message
   - Suggested action
   - Retry button
   - Support link if needed

4. **Success Confirmations**
   - Toast notifications (top-right)
   - Success icon + message
   - Auto-dismiss after 3-5 seconds
   - Action links when relevant

---

### Responsive Design

**Breakpoints:**
```css
mobile: < 640px
tablet: 640px - 1024px
desktop: > 1024px
```

**Mobile Optimizations:**
- Bottom navigation instead of sidebar
- Simplified calendar (day view only)
- Swipe gestures for actions
- Click-to-call phone numbers
- Large touch targets (min 44x44px)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic infrastructure and agent creation

**Deliverables:**
- ✅ Project setup (Next.js + Convex + Clerk)
- ✅ Database schema implementation
- ✅ ElevenLabs API integration (create agent)
- ✅ Basic UI layout (header, sidebar, routes)
- ✅ Agent creation wizard (steps 1-4)
- ✅ Voice selection interface
- ✅ Document upload (basic)

**Success Criteria:**
- User can create account
- User can create agent with ElevenLabs
- Agent receives phone number
- Basic dashboard shows created agents

---

### Phase 2: Reservations (Week 3-4)

**Goal:** Complete reservation system

**Deliverables:**
- ✅ Webhook endpoint for ElevenLabs
- ✅ Reservation CRUD operations
- ✅ 4-digit ID generation
- ✅ Calendar view (FullCalendar integration)
- ✅ Reservation detail modal
- ✅ Manual reservation creation
- ✅ Real-time updates

**Success Criteria:**
- Agent can create reservations via phone
- Reservations appear in calendar immediately
- Users can manually create/edit/cancel reservations
- All required fields captured correctly

---

### Phase 3: Management & Analytics (Week 5-6)

**Goal:** Full agent management and usage tracking

**Deliverables:**
- ✅ Agent management dashboard
- ✅ Usage tracking implementation
- ✅ ElevenLabs analytics sync
- ✅ Usage charts and reports
- ✅ Document management interface
- ✅ Agent configuration updates
- ✅ Activity logging

**Success Criteria:**
- View all agents in one dashboard
- Track minutes and costs accurately
- Update agent configuration without recreating
- Replace documents seamlessly
- View usage trends over time

---

### Phase 4: Polish & Launch (Week 7-8)

**Goal:** Production-ready, optimized, documented

**Deliverables:**
- ✅ Mobile optimization
- ✅ Error handling & edge cases
- ✅ Loading states everywhere
- ✅ Empty states with guidance
- ✅ Onboarding flow
- ✅ Help documentation
- ✅ Billing integration (Stripe)
- ✅ Email notifications
- ✅ Performance optimization

**Success Criteria:**
- <2 second page loads
- 99%+ uptime
- Mobile fully functional
- Clear onboarding for new users
- Comprehensive help docs
- Billing system working

---

## Code Structure & Organization

```
restaurant-agent-platform/
├── app/                                 # Next.js App Router
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Dashboard layout
│   │   ├── dashboard/page.tsx          # Main dashboard
│   │   │
│   │   ├── agents/
│   │   │   ├── page.tsx                # Agents list
│   │   │   ├── create/page.tsx         # Create agent wizard
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Agent detail
│   │   │       ├── configure/page.tsx  # Configuration
│   │   │       └── usage/page.tsx      # Usage & analytics
│   │   │
│   │   ├── restaurants/
│   │   │   ├── page.tsx                # Restaurants list
│   │   │   ├── create/page.tsx         # Create restaurant
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Restaurant detail
│   │   │       ├── calendar/page.tsx   # Reservation calendar
│   │   │       └── documents/page.tsx  # Document management
│   │   │
│   │   ├── reservations/
│   │   │   ├── page.tsx                # All reservations
│   │   │   ├── create/page.tsx         # Manual create
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Reservation detail
│   │   │       └── edit/page.tsx       # Edit reservation
│   │   │
│   │   ├── usage/
│   │   │   └── page.tsx                # Usage & billing
│   │   │
│   │   └── settings/
│   │       └── page.tsx                # Account settings
│   │
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── elevenlabs/
│   │   │       ├── reservations/route.ts  # Reservation webhooks
│   │   │       └── events/route.ts        # Call events
│   │   │
│   │   └── elevenlabs/
│   │       └── test-call/route.ts      # Test call endpoint
│   │
│   ├── layout.tsx
│   ├── page.tsx                        # Landing page
│   └── globals.css
│
├── convex/                             # Convex backend
│   ├── _generated/
│   │   ├── api.d.ts
│   │   ├── api.js
│   │   ├── dataModel.d.ts
│   │   └── server.d.ts
│   │
│   ├── elevenlabs/                     # ElevenLabs integrations
│   │   ├── agentManagement.ts          # Create/update agents
│   │   ├── knowledgeBase.ts            # Document upload
│   │   ├── phoneNumbers.ts             # Number provisioning
│   │   ├── analytics.ts                # Usage sync
│   │   └── webhooks.ts                 # Webhook handlers
│   │
│   ├── agents.ts                       # Agent queries/mutations
│   ├── reservations.ts                 # Reservation CRUD
│   ├── restaurants.ts                  # Restaurant management
│   ├── documents.ts                    # Document management
│   ├── usage.ts                        # Usage tracking
│   ├── users.ts                        # User management
│   ├── schema.ts                       # Database schema
│   ├── http.ts                         # HTTP actions
│   └── crons.ts                        # Scheduled tasks
│
├── features/                           # Feature modules
│   ├── agents/
│   │   ├── components/
│   │   │   ├── CreateAgentWizard.tsx
│   │   │   ├── AgentsList.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentDetail.tsx
│   │   │   ├── VoiceSelector.tsx
│   │   │   ├── ConfigurationPanel.tsx
│   │   │   └── UsageSummary.tsx
│   │   ├── hooks/
│   │   │   ├── useAgents.ts
│   │   │   ├── useCreateAgent.ts
│   │   │   └── useVoices.ts
│   │   └── utils/
│   │       ├── agentValidation.ts
│   │       └── promptGenerator.ts
│   │
│   ├── reservations/
│   │   ├── components/
│   │   │   ├── CalendarView.tsx
│   │   │   ├── ReservationCard.tsx
│   │   │   ├── ReservationDetail.tsx
│   │   │   ├── ReservationForm.tsx
│   │   │   ├── ConflictChecker.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── hooks/
│   │   │   ├── useReservations.ts
│   │   │   ├── useCalendar.ts
│   │   │   └── useReservationId.ts
│   │   └── utils/
│   │       ├── reservationValidation.ts
│   │       ├── idGenerator.ts
│   │       └── timeSlotHelper.ts
│   │
│   ├── restaurants/
│   │   ├── components/
│   │   │   ├── RestaurantForm.tsx
│   │   │   ├── RestaurantCard.tsx
│   │   │   ├── OperatingHoursEditor.tsx
│   │   │   └── LocationPicker.tsx
│   │   ├── hooks/
│   │   │   └── useRestaurants.ts
│   │   └── utils/
│   │       └── restaurantValidation.ts
│   │
│   ├── documents/
│   │   ├── components/
│   │   │   ├── DocumentLibrary.tsx
│   │   │   ├── DocumentUploader.tsx
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── DocumentPreview.tsx
│   │   │   └── VersionHistory.tsx
│   │   ├── hooks/
│   │   │   ├── useDocuments.ts
│   │   │   └── useDocumentUpload.ts
│   │   └── utils/
│   │       ├── fileValidation.ts
│   │       └── documentParser.ts
│   │
│   └── usage/
│       ├── components/
│       │   ├── UsageChart.tsx
│       │   ├── UsageBreakdown.tsx
│       │   ├── CostCalculator.tsx
│       │   └── BillingHistory.tsx
│       ├── hooks/
│       │   └── useUsage.ts
│       └── utils/
│           └── costCalculator.ts
│
├── lib/                                # Shared utilities
│   ├── elevenlabs/
│   │   ├── client.ts                   # ElevenLabs API client
│   │   ├── types.ts                    # Type definitions
│   │   └── prompts/
│   │       ├── reservationAgent.ts
│   │       └── informationAgent.ts
│   │
│   ├── utils/
│   │   ├── date.ts                     # Date formatting
│   │   ├── phone.ts                    # Phone formatting
│   │   ├── currency.ts                 # Currency formatting
│   │   └── validation.ts               # Common validation
│   │
│   └── constants.ts
│
├── shared/                             # Shared components
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── calendar.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNav.tsx
│   │   │
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── Toast.tsx
│   │
│   └── hooks/
│       ├── useMediaQuery.ts
│       ├── useDebounce.ts
│       ├── useToast.ts
│       └── useConfirm.ts
│
├── public/
│   ├── images/
│   └── icons/
│
├── .env.local
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Testing Requirements

### Unit Tests

**Coverage Target:** 80%+

**Key Areas:**
- ID generation (4-digit uniqueness)
- Time slot validation
- Conflict detection
- Date/time formatting
- Phone number formatting
- Cost calculation

**Example:**
```typescript
// features/reservations/utils/__tests__/idGenerator.test.ts

describe('generateReservationId', () => {
  it('generates 4-digit ID', async () => {
    const id = await generateReservationId('restaurant_123');
    expect(id).toMatch(/^\d{4}$/);
  });

  it('generates unique IDs', async () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const id = await generateReservationId('restaurant_123');
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });
});
```

---

### Integration Tests

**Test ElevenLabs Integration:**
```typescript
// convex/__tests__/elevenlabs.test.ts

describe('ElevenLabs Agent Creation', () => {
  it('creates agent and provisions phone number', async () => {
    const result = await createCompleteAgent({
      restaurantId: 'test_restaurant',
      voiceId: 'test_voice',
      documents: [],
    });

    expect(result).toHaveProperty('agentId');
    expect(result).toHaveProperty('phoneNumber');
    expect(result.phoneNumber).toMatch(/^\+1\d{10}$/);
  });
});
```

---

### E2E Tests (Playwright)

**Critical Flows:**
1. Sign up → Create restaurant → Create agent → Agent is live
2. Make test call → Create reservation → Appears in calendar
3. Manual reservation → Edit → Cancel → Status updates

```typescript
// e2e/agent-creation.spec.ts

test('complete agent creation flow', async ({ page }) => {
  await page.goto('/dashboard/agents/create');
  
  // Step 1: Restaurant info
  await page.fill('[name="restaurant-name"]', 'Test Restaurant');
  await page.click('text=Next');
  
  // Step 2: Voice selection
  await page.click('[data-voice-id="rachel"]');
  await page.click('text=Next');
  
  // Step 3: Upload menu
  await page.setInputFiles('input[type="file"]', 'test-menu.pdf');
  await page.click('text=Next');
  
  // Step 4: Review & Launch
  await page.click('text=Create Agent');
  
  // Verify success
  await expect(page.locator('text=Agent created successfully')).toBeVisible();
  await expect(page.locator('[data-testid="phone-number"]')).toBeVisible();
});
```

---

## Deployment & Infrastructure

### Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=
NODE_ENV=
```

---

### Deployment Steps

**1. Deploy Convex:**
```bash
npx convex deploy --prod
npx convex env set ELEVENLABS_API_KEY "your-key"
```

**2. Deploy to Vercel:**
```bash
vercel --prod
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add ELEVENLABS_API_KEY
```

**3. Configure Webhooks:**
- ElevenLabs: `https://your-domain.com/api/webhooks/elevenlabs/reservations`
- Clerk: `https://your-domain.com/api/webhooks/clerk`

**4. Setup Cron Jobs:**
```typescript
// convex/crons.ts
export const hourly = cronJobs.hourly(
  "sync usage data",
  { hourUTC: 0 },
  api.elevenlabs.analytics.scheduledUsageSync
);
```

---

## Security & Privacy

### Data Security

**At Rest:**
- All data encrypted in Convex
- PII (customer names, phones) encrypted
- API keys in environment variables only

**In Transit:**
- HTTPS enforced
- Webhook signature verification
- API key rotation policy

**Access Control:**
- User authentication via Clerk
- Restaurant-level data isolation
- No cross-restaurant data access

---

### Compliance

**GDPR:**
- Data export capability
- Right to deletion
- Clear privacy policy
- Consent for call recording

**CCPA:**
- Do not sell data
- Opt-out mechanism
- Data inventory

---

## Performance Requirements

### Response Times

| Operation | Target | Max |
|-----------|--------|-----|
| Page Load | <1s | <2s |
| Agent Creation | <30s | <60s |
| Reservation Creation (webhook) | <500ms | <1s |
| Calendar Load | <800ms | <1.5s |
| Document Upload | <10s | <30s |

---

### Scalability

**MVP:**
- 500 restaurants
- 5,000 users
- 50,000 reservations/month
- 500 concurrent users

**Production:**
- 50,000 restaurants
- 200,000 users
- 10M reservations/month
- 5,000 concurrent users

---

## Success Metrics

### Product KPIs

**Adoption:**
- New agents created per week
- Multi-location adoption rate (>2 agents)
- User retention (30-day, 90-day)

**Usage:**
- Calls per agent per day
- Reservation success rate (>95%)
- Average call duration
- Agent uptime (>99.5%)

**Business:**
- Revenue per user
- Churn rate (<5% monthly)
- Customer satisfaction (>4.5/5)
- NPS (>50)

---

## Glossary

**Agent:** ElevenLabs AI voice assistant dedicated to one restaurant  
**Reservation ID:** 4-digit unique identifier (0000-9999)  
**Knowledge Base:** Restaurant-specific documents (menu, policies)  
**RAG:** Retrieval Augmented Generation (ElevenLabs document system)  
**Usage:** Conversation minutes tracked for billing  
**Webhook:** HTTP callback from ElevenLabs for events  

---

## Contact & Support

**Development Team:**
- Technical Lead: [Your Name]
- ElevenLabs Integration: [Team Member]
- Frontend: [Team Member]

**Resources:**
- ElevenLabs Docs: https://elevenlabs.io/d