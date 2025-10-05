# Restaurant AI Agent Platform - Project Requirements

## Project Overview

A multi-tenant SaaS platform that enables restaurant owners to create and manage AI-powered phone agents using ElevenLabs API. Each agent handles reservations and provides restaurant information through natural voice conversations.

## Core Concept

**One Restaurant = One Specialized Agent**

Each AI agent is dedicated to a specific restaurant, with customized knowledge about that restaurant's menu, hours, and policies. Restaurant owners can create multiple agents for different locations from a single account.

---

## Technical Stack

- **AI Voice & Agents**: ElevenLabs API (primary provider for all AI functionality)
- **Backend & Database**: Convex
- **Authentication**: Clerk
- **Frontend**: Modern web application with calendar view

---

## Key Features

### 1. User Account Management
- Restaurant owners create an account via Clerk authentication
- One account can manage multiple restaurants/agents
- Each restaurant gets its own dedicated AI agent instance

### 2. Agent Creation & Customization

**Per-Agent Configuration:**
- Restaurant name
- Operating hours
- Voice selection (from ElevenLabs voice library)
- Unique phone number assignment
- Restaurant-specific knowledge base

**Knowledge Base (ElevenLabs RAG):**
- Upload menu documents
- Upload restaurant policies
- Upload any additional information documents
- All documents processed via ElevenLabs document upload API

### 3. Reservation Management

**Agent Capabilities:**
Each agent can perform three operations via voice conversation:

1. **Create Reservation**
   - Collect: Full name, date, time, party size
   - Generate unique 4-digit reservation ID
   - Confirm details with caller

2. **Edit Reservation**
   - Identify reservation by ID or caller information
   - Modify date, time, or party size
   - Confirm changes

3. **Cancel Reservation**
   - Identify reservation by ID or caller information
   - Remove from calendar
   - Provide cancellation confirmation

**Required Information:**
- Full name (required)
- Date (required)
- Time (required)
- Number of guests (required)
- Unique 4-digit reservation ID (auto-generated)

### 4. Calendar View

**Per-Restaurant Dashboard:**
- Clean, visual calendar interface
- Display all reservations for the selected restaurant
- View reservation details (name, time, party size, ID)
- Filter by date range
- Quick access to reservation management

### 5. Usage Tracking & Billing

**Metrics to Track:**
- Conversation minutes per agent
- Total calls handled per agent
- Per-agent usage for billing purposes

**Billing Model:**
- Charge based on individual agent usage
- Track minutes consumed per restaurant/agent

---

## ElevenLabs API Integration Requirements

### Primary APIs to Utilize

1. **Conversational AI API**
   - Create agent instances
   - Configure agent behavior for reservation handling
   - Enable phone call capabilities

2. **Voice Library API**
   - Allow users to select from available voices
   - Assign voice to specific agent

3. **RAG (Document Upload) API**
   - Upload menu PDFs/documents
   - Upload restaurant information
   - Create knowledge base per agent
   - Enable agents to answer questions about the restaurant

4. **Agent Management API**
   - Create new agent instances
   - Update agent configurations
   - Monitor agent performance

5. **Call Handling API**
   - Phone number provisioning
   - Call routing to correct agent
   - Conversation logging

6. **Analytics API**
   - Track conversation duration
   - Monitor usage metrics
   - Extract reservation data from conversations

---

## User Flow

### Restaurant Owner Journey

1. **Sign Up**: Create account via Clerk
2. **Create First Agent**: 
   - Enter restaurant details (name, hours)
   - Select voice from ElevenLabs library
   - Get assigned phone number
3. **Upload Knowledge**: 
   - Upload menu (PDF/DOC)
   - Upload any additional restaurant information
   - ElevenLabs processes documents for RAG
4. **Go Live**: Agent is immediately ready to take calls
5. **Monitor**: View reservations in calendar, track usage
6. **Scale**: Create additional agents for other locations

### Caller Journey

1. **Call Restaurant**: Dial agent's phone number
2. **Interact with Agent**: Natural voice conversation
3. **Make/Edit/Cancel Reservation**: Agent handles request
4. **Receive Confirmation**: Get 4-digit reservation ID
5. **Done**: Seamless experience, no human intervention needed

---

## Key Requirements

### Speed & Simplicity
- **Fast Setup**: Users should be able to go from signup to live agent in under 5 minutes
- **Minimal Configuration**: Upload documents, select voice, enter basic info - that's it
- **ElevenLabs-First**: Leverage all available ElevenLabs features to minimize custom development

### Data Isolation
- Each agent operates independently
- Restaurant A's agent cannot access Restaurant B's data
- Separate knowledge bases per agent

### Reliability
- Accurate reservation capture (name, date, time, party size)
- Consistent 4-digit ID generation (0000-9999)
- Proper handling of edge cases (double bookings, invalid dates, etc.)

### User Experience
- Clean, intuitive dashboard
- Easy-to-read calendar view
- Quick access to reservation details
- Clear usage metrics for billing transparency

---

## Success Criteria

1. Restaurant owner can create a fully functional AI agent in under 5 minutes
2. Agent accurately handles 95%+ of reservation requests without human intervention
3. All reservations properly logged with complete information
4. Calendar view provides clear overview of all bookings
5. Usage tracking enables accurate per-agent billing
6. System scales to support multiple agents per user seamlessly

---

## Future Considerations

- Multi-language support (via ElevenLabs language capabilities)
- SMS confirmations for reservations
- Integration with existing restaurant management systems
- Advanced analytics and reporting
- Customer feedback collection

---

## Notes for Development

- Prioritize ElevenLabs native features over custom solutions
- Design for scalability from day one (multi-tenant architecture)
- Ensure clean separation between restaurant data
- Build robust error handling for voice interactions
- Create clear admin dashboard for usage monitoring 