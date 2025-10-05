# Restaurant AI Agent Platform - Development Rules

## Overview

This document defines the code quality standards, architecture patterns, and development practices for the Restaurant AI Agent Platform. All developers must follow these rules to ensure clean, maintainable, and scalable code.

---

## 1. Architecture Principles

### 1.1 Feature-Based Organization (MANDATORY)

**DO organize by feature/domain, NOT by technical role:**

```
✅ CORRECT:
features/
├── agents/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   └── types/

❌ WRONG:
components/
├── AgentCard.tsx
├── RestaurantCard.tsx
hooks/
├── useAgents.ts
├── useRestaurants.ts
```

**Why:** Everything related to a feature stays together. Easy to find, modify, and delete features.

### 1.2 Separation of Concerns

**Server Components vs Client Components:**
- Server Components by default (Next.js App Router)
- Client Components ONLY when needed (use `"use client"`)
- Keep components small and focused (< 200 lines)

**Logic vs Presentation:**
- Extract ALL business logic into custom hooks
- Components should be primarily presentational
- No API calls or complex logic in components

### 1.3 Co-location

**Keep related code together:**
- Components with their tests
- Hooks with their implementations
- Types with their usage
- Utilities with their consumers

---

## 2. Code Quality Standards

### 2.1 TypeScript (100% TypeScript, ZERO JavaScript)

**Type everything explicitly:**

```typescript
✅ CORRECT:
interface CreateAgentParams {
  restaurantId: string;
  voiceId: string;
  config: AgentConfig;
}

export async function createAgent(params: CreateAgentParams): Promise<Agent> {
  // implementation
}

❌ WRONG:
export async function createAgent(params) {
  // implementation
}
```

**No `any` types allowed:**

```typescript
✅ CORRECT:
type WebhookPayload = {
  eventType: string;
  data: ReservationData | CallData;
};

❌ WRONG:
const payload: any = req.body;
```

**Exceptions:** `v.any()` in Convex schema when ElevenLabs payload structure is truly dynamic.

### 2.2 Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `AgentCard.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useAgents.ts`)
- Utilities: `camelCase.ts` (e.g., `dateFormatter.ts`)
- Types: `PascalCase.types.ts` (e.g., `Agent.types.ts`)
- Tests: `*.test.ts` or `*.spec.ts`

**Variables & Functions:**
- Variables: `camelCase`
- Functions: `camelCase` (verbs: `createAgent`, `formatDate`)
- Constants: `UPPER_SNAKE_CASE`
- Components: `PascalCase`
- Types/Interfaces: `PascalCase`

**Booleans:**
- Prefix with `is`, `has`, `should`, `can`
- Examples: `isLoading`, `hasError`, `shouldSync`, `canEdit`

### 2.3 Component Structure

**Order matters:**

```typescript
// 1. Imports (grouped)
import { useState } from 'react';
import { useQuery } from 'convex/react';

import { Button } from '@/shared/components/ui/button';
import { useAgents } from '@/features/agents/hooks/useAgents';
import type { Agent } from '@/features/agents/types';

// 2. Types/Interfaces
interface AgentCardProps {
  agent: Agent;
  onEdit?: () => void;
}

// 3. Component
export function AgentCard({ agent, onEdit }: AgentCardProps) {
  // 3a. Hooks
  const [isExpanded, setIsExpanded] = useState(false);

  // 3b. Derived state
  const displayName = agent.name || 'Unnamed Agent';

  // 3c. Event handlers
  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  // 3d. Early returns
  if (!agent) return null;

  // 3e. Render
  return (
    <div onClick={handleClick}>
      {displayName}
    </div>
  );
}

// 4. Sub-components (if any, keep small)
// 5. Exports (if any)
```

### 2.4 Custom Hooks Pattern (CRITICAL)

**Extract ALL data logic into custom hooks:**

```typescript
✅ CORRECT:
// features/agents/hooks/useAgents.ts
export function useAgents() {
  const agents = useQuery(api.agents.list);
  const create = useMutation(api.agents.create);
  const update = useMutation(api.agents.update);

  return {
    agents,
    isLoading: agents === undefined,
    createAgent: create,
    updateAgent: update,
  };
}

// features/agents/components/AgentsList.tsx
export function AgentsList() {
  const { agents, isLoading } = useAgents();

  if (isLoading) return <Spinner />;
  return <div>{agents.map(a => <AgentCard key={a._id} agent={a} />)}</div>;
}

❌ WRONG:
// Component with direct API calls
export function AgentsList() {
  const agents = useQuery(api.agents.list);
  const create = useMutation(api.agents.create);
  // ... lots of logic in component
}
```

### 2.5 Error Handling

**Always handle errors explicitly:**

```typescript
✅ CORRECT:
try {
  const agent = await createAgent(params);
  toast.success('Agent created successfully');
  return agent;
} catch (error) {
  console.error('Failed to create agent:', error);
  toast.error('Failed to create agent. Please try again.');
  throw error;
}

❌ WRONG:
const agent = await createAgent(params); // No error handling
```

**Convex mutations/queries:**

```typescript
✅ CORRECT:
const { agents, error } = useAgents();

if (error) {
  return <ErrorState message="Failed to load agents" />;
}

❌ WRONG:
const agents = useQuery(api.agents.list); // No error handling
```

### 2.6 Loading & Empty States

**Every data fetch needs loading AND empty states:**

```typescript
✅ CORRECT:
export function AgentsList() {
  const { agents, isLoading } = useAgents();

  if (isLoading) return <LoadingSpinner />;
  if (!agents || agents.length === 0) {
    return <EmptyState message="No agents yet" action={<CreateAgentButton />} />;
  }

  return <div>{agents.map(...)}</div>;
}

❌ WRONG:
export function AgentsList() {
  const { agents } = useAgents();
  return <div>{agents?.map(...)}</div>; // Silent failure
}
```

---

## 3. Convex Backend Standards

### 3.1 File Organization

```
convex/
├── schema.ts              # Database schema (single source of truth)
├── agents.ts              # Agent queries/mutations
├── reservations.ts        # Reservation CRUD
├── elevenlabs/            # ElevenLabs integrations
│   ├── agentManagement.ts
│   ├── analytics.ts
│   └── webhooks.ts
└── http.ts                # HTTP actions (webhooks)
```

### 3.2 Query & Mutation Patterns

**Queries (read-only, reactive):**

```typescript
// convex/agents.ts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) throw new Error('User not found');

    return await ctx.db
      .query('agents')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .collect();
  },
});
```

**Mutations (write operations):**

```typescript
export const create = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    voiceId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Validate ownership
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    // Create agent
    const agentId = await ctx.db.insert('agents', {
      restaurantId: args.restaurantId,
      ownerId: restaurant.ownerId,
      elevenLabsAgentId: '', // Will be set by action
      voiceId: args.voiceId,
      name: args.name,
      status: 'configuring',
      totalCalls: 0,
      totalMinutes: 0,
      errorCount: 0,
      documents: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return agentId;
  },
});
```

**Actions (external API calls):**

```typescript
export const createElevenLabsAgent = action({
  args: {
    agentId: v.id('agents'),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.get, { id: args.agentId });

    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: agent.name,
        voice_id: agent.voiceId,
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const data = await response.json();

    await ctx.runMutation(api.agents.update, {
      id: args.agentId,
      elevenLabsAgentId: data.agent_id,
      status: 'active',
    });

    return data.agent_id;
  },
});
```

### 3.3 Authentication & Authorization

**ALWAYS verify user identity:**

```typescript
✅ CORRECT:
export const get = query({
  args: { id: v.id('restaurants') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const restaurant = await ctx.db.get(args.id);
    if (!restaurant) return null;

    // Verify ownership
    const user = await getUserByClerkId(ctx.db, identity.subject);
    if (restaurant.ownerId !== user._id) {
      throw new Error('Not authorized');
    }

    return restaurant;
  },
});

❌ WRONG:
export const get = query({
  args: { id: v.id('restaurants') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id); // No auth check!
  },
});
```

### 3.4 Indexing (MANDATORY for queries)

**Create indexes for all query patterns:**

```typescript
// convex/schema.ts
reservations: defineTable({
  restaurantId: v.id('restaurants'),
  date: v.string(),
  status: v.string(),
  // ...
})
.index('by_restaurant', ['restaurantId'])
.index('by_restaurant_date', ['restaurantId', 'date'])
.index('by_restaurant_status', ['restaurantId', 'status'])
```

---

## 4. UI/UX Standards

### 4.1 Component Library

**ONLY use shadcn/ui components:**

```typescript
✅ CORRECT:
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';

❌ WRONG:
import { Button } from 'react-bootstrap'; // No external UI libraries
```

### 4.2 Styling

**TailwindCSS ONLY (no CSS files except globals.css):**

```typescript
✅ CORRECT:
<div className="flex items-center gap-4 rounded-lg border p-4">
  <h2 className="text-lg font-semibold">Agent Name</h2>
</div>

❌ WRONG:
<div className="agent-card">  // Custom CSS class
  <h2>Agent Name</h2>
</div>
```

**Use Tailwind's responsive utilities:**

```typescript
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

### 4.3 Accessibility

**ALWAYS include:**
- Semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus states (`:focus-visible`)
- Alt text for images

```typescript
✅ CORRECT:
<button
  aria-label="Delete agent"
  onClick={handleDelete}
  className="focus-visible:ring-2"
>
  <TrashIcon />
</button>

❌ WRONG:
<div onClick={handleDelete}>  // Not keyboard accessible
  <TrashIcon />
</div>
```

### 4.4 Loading States

**Use skeleton screens for better UX:**

```typescript
✅ CORRECT:
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

❌ WRONG:
if (isLoading) return <div>Loading...</div>;
```

---

## 5. Data Handling

### 5.1 Date & Time

**ALWAYS use ISO 8601 format:**

```typescript
✅ CORRECT:
const date = '2025-10-15';  // YYYY-MM-DD
const time = '14:30';       // HH:MM (24-hour)
const timestamp = Date.now();  // Unix timestamp in milliseconds

❌ WRONG:
const date = '10/15/2025';  // Ambiguous
const time = '2:30 PM';     // Inconsistent
```

**Use `date-fns` for formatting:**

```typescript
import { format, parseISO } from 'date-fns';

const formattedDate = format(parseISO('2025-10-15'), 'PPP');
// Output: "October 15, 2025"
```

### 5.2 Phone Numbers

**Store in E.164 format:**

```typescript
✅ CORRECT:
const phone = '+14155551234';  // E.164 format

// Display formatting
import { formatPhoneNumber } from '@/lib/utils/phone';
const display = formatPhoneNumber('+14155551234');
// Output: "(415) 555-1234"

❌ WRONG:
const phone = '(415) 555-1234';  // Formatted in database
```

### 5.3 Currency

**Store as cents (integers), display as dollars:**

```typescript
✅ CORRECT:
// Database: 2550 (cents)
// Display: $25.50

import { formatCurrency } from '@/lib/utils/currency';
const display = formatCurrency(2550); // "$25.50"

❌ WRONG:
// Database: 25.50 (floating point precision issues)
```

---

## 6. Security Standards

### 6.1 Environment Variables

**NEVER commit secrets:**

```typescript
✅ CORRECT:
const apiKey = process.env.ELEVENLABS_API_KEY;

// .gitignore includes:
.env
.env.local
.env.*.local

❌ WRONG:
const apiKey = 'sk_abc123...'; // Hardcoded secret
```

### 6.2 Input Validation

**Validate ALL user input:**

```typescript
✅ CORRECT:
export const create = mutation({
  args: {
    name: v.string(),
    partySize: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (args.partySize < 1 || args.partySize > 50) {
      throw new Error('Party size must be between 1 and 50');
    }
    // ...
  },
});

❌ WRONG:
export const create = mutation({
  args: { name: v.string(), partySize: v.number() },
  handler: async (ctx, args) => {
    // No validation
    await ctx.db.insert('reservations', args);
  },
});
```

### 6.3 Webhook Verification

**ALWAYS verify webhook signatures:**

```typescript
✅ CORRECT:
export async function POST(req: Request) {
  const signature = req.headers.get('x-elevenlabs-signature');
  const body = await req.text();

  if (!verifyWebhookSignature(signature, body, process.env.ELEVENLABS_WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Process webhook
}

❌ WRONG:
export async function POST(req: Request) {
  const body = await req.json();
  // Process without verification
}
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

**Test all utility functions:**

```typescript
// features/reservations/utils/__tests__/idGenerator.test.ts
import { generateReservationId } from '../idGenerator';

describe('generateReservationId', () => {
  it('generates 4-digit ID', () => {
    const id = generateReservationId();
    expect(id).toMatch(/^\d{4}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateReservationId());
    }
    expect(ids.size).toBe(100);
  });
});
```

### 7.2 Integration Tests

**Test critical flows:**

```typescript
// __tests__/agent-creation.test.ts
describe('Agent Creation Flow', () => {
  it('creates agent and provisions phone number', async () => {
    const agent = await createCompleteAgent({
      restaurantId: 'test_restaurant',
      voiceId: 'test_voice',
    });

    expect(agent).toHaveProperty('elevenLabsAgentId');
    expect(agent).toHaveProperty('phoneNumber');
    expect(agent.phoneNumber).toMatch(/^\+1\d{10}$/);
  });
});
```

### 7.3 Test Coverage

**Minimum coverage requirements:**
- Utilities: 90%+
- Hooks: 80%+
- Components: 70%+
- Overall: 80%+

---

## 8. Performance Standards

### 8.1 Database Queries

**Use indexes and batch queries:**

```typescript
✅ CORRECT:
// Single query with index
const reservations = await ctx.db
  .query('reservations')
  .withIndex('by_restaurant_date', (q) =>
    q.eq('restaurantId', restaurantId).eq('date', date)
  )
  .collect();

❌ WRONG:
// Multiple queries in loop
const reservations = [];
for (const date of dates) {
  const res = await ctx.db.query('reservations').filter(...).collect();
  reservations.push(...res);
}
```

### 8.2 Component Optimization

**Memoize expensive computations:**

```typescript
✅ CORRECT:
import { useMemo } from 'react';

const sortedAgents = useMemo(() => {
  return agents.sort((a, b) => b.totalCalls - a.totalCalls);
}, [agents]);

❌ WRONG:
const sortedAgents = agents.sort((a, b) => b.totalCalls - a.totalCalls);
// Re-sorts on every render
```

### 8.3 Image Optimization

**Use Next.js Image component:**

```typescript
✅ CORRECT:
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Company Logo"
  width={200}
  height={50}
  priority
/>

❌ WRONG:
<img src="/logo.png" alt="Company Logo" />
```

---

## 9. Git & Deployment

### 9.1 Commit Messages

**Use conventional commits:**

```
✅ CORRECT:
feat(agents): add voice selection interface
fix(reservations): correct 4-digit ID generation
docs(readme): update installation instructions
refactor(hooks): extract useAgents logic

❌ WRONG:
fixed stuff
WIP
asdf
```

### 9.2 Branch Naming

```
✅ CORRECT:
feature/agent-creation-wizard
fix/reservation-id-collision
refactor/hooks-organization

❌ WRONG:
new-stuff
johns-branch
fix
```

### 9.3 Pull Requests

**MUST include:**
- Clear description of changes
- Screenshots for UI changes
- Test coverage for new code
- No breaking changes (or documented migration)
- Passing CI/CD checks

---

## 10. Code Review Checklist

Before merging, verify:

- [ ] TypeScript with no `any` types (except Convex schema exceptions)
- [ ] All functions have explicit return types
- [ ] Error handling on all async operations
- [ ] Loading states for all data fetching
- [ ] Empty states for lists/collections
- [ ] Proper authentication & authorization
- [ ] Database indexes for all queries
- [ ] Input validation on mutations
- [ ] Tests written and passing
- [ ] No console.logs in production code
- [ ] No commented-out code
- [ ] Proper accessibility (ARIA, keyboard nav)
- [ ] Mobile-responsive (tested on mobile viewport)
- [ ] No magic numbers (use constants)
- [ ] No hardcoded strings (use constants or i18n)

---

## 11. Common Patterns

### 11.1 Feature Module Template

```
features/[feature-name]/
├── components/
│   ├── [FeatureName]List.tsx
│   ├── [FeatureName]Card.tsx
│   ├── [FeatureName]Detail.tsx
│   └── [FeatureName]Form.tsx
├── hooks/
│   ├── use[FeatureName].ts
│   └── use[FeatureName]Actions.ts
├── utils/
│   └── [featureName]Validation.ts
└── types.ts
```

### 11.2 Page Template

```typescript
// app/dashboard/[feature]/page.tsx
import { FeatureContainer } from '@/features/[feature]/components/FeatureContainer';

export default function FeaturePage() {
  return <FeatureContainer />;
}
```

### 11.3 Custom Hook Template

```typescript
// features/[feature]/hooks/use[Feature].ts
export function use[Feature]() {
  const data = useQuery(api.[feature].list);
  const create = useMutation(api.[feature].create);
  const update = useMutation(api.[feature].update);
  const remove = useMutation(api.[feature].remove);

  return {
    data,
    isLoading: data === undefined,
    create,
    update,
    remove,
  };
}
```

---

## 12. Forbidden Practices

**NEVER:**

1. ❌ Use MVC terminology (controllers, models, views)
2. ❌ Create massive components (>200 lines)
3. ❌ Put business logic in components
4. ❌ Use inline styles (style prop)
5. ❌ Import from `node_modules` directly (use package.json aliases)
6. ❌ Commit `.env` files
7. ❌ Use `var` (use `const` or `let`)
8. ❌ Ignore TypeScript errors with `@ts-ignore`
9. ❌ Skip error handling
10. ❌ Deploy without testing

---

## 13. Best Practices Summary

### ✅ DO:

- Use TypeScript for everything
- Organize by feature/domain
- Extract logic into custom hooks
- Keep components small and focused
- Use shadcn/ui components
- Write tests for critical code
- Handle errors explicitly
- Add loading & empty states
- Use proper indexes in Convex
- Validate all user input
- Verify webhook signatures
- Use semantic HTML
- Make UI accessible
- Optimize for mobile
- Write clear commit messages
- Document complex logic

### ❌ DON'T:

- Use JavaScript
- Organize by technical role
- Put logic in components
- Create monolithic components
- Use external UI libraries
- Skip tests
- Ignore errors
- Show raw loading text
- Query without indexes
- Trust user input
- Accept webhooks without verification
- Use divs for everything
- Ignore accessibility
- Design desktop-only
- Write vague commits
- Leave code unexplained

---

## 14. Resources

**Documentation:**
- Next.js: https://nextjs.org/docs
- Convex: https://docs.convex.dev
- Clerk: https://clerk.com/docs
- ElevenLabs: https://elevenlabs.io/docs
- shadcn/ui: https://ui.shadcn.com
- TailwindCSS: https://tailwindcss.com/docs

**Internal:**
- `/docs/technical.md` - Complete technical specification
- `/docs/requirements.md` - Product requirements
- `/docs/REACT.md` - React architecture guide

---

## 15. Enforcement

These rules are **MANDATORY**, not suggestions. Code that violates these standards will be:
1. Flagged in code review
2. Blocked from merging
3. Refactored immediately

**Remember:** Clean code is not about showing off. It's about making the codebase maintainable, scalable, and pleasant to work with for everyone on the team.

---

**Last Updated:** October 4, 2025
**Version:** 1.0
