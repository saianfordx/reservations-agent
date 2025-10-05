# Next.js/React Architecture Guide

## Better Patterns for Next.js/React

### 1. Feature-Based Architecture (Recommended)

Organize by feature/domain, not by technical role:

```
src/
├── features/
│   ├── restaurants/
│   │   ├── components/
│   │   │   ├── RestaurantList.tsx
│   │   │   ├── RestaurantCard.tsx
│   │   │   └── RestaurantForm.tsx
│   │   ├── hooks/
│   │   │   ├── useRestaurants.ts
│   │   │   └── useRestaurantForm.ts
│   │   ├── api/
│   │   │   └── restaurants.ts (convex queries/mutations)
│   │   ├── types/
│   │   │   └── restaurant.types.ts
│   │   └── utils/
│   │       └── restaurantValidation.ts
│   │
│   ├── audits/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   │
│   └── dashboard/
│       ├── components/
│       └── hooks/
│
├── shared/
│   ├── components/ui/  (shadcn components)
│   ├── hooks/          (useDebounce, useMediaQuery)
│   └── utils/          (cn, formatDate)
│
└── app/
    ├── dashboard/
    │   └── page.tsx
    └── api/
```

**Benefits:**
- Everything related to a feature is together
- Easy to find and modify features
- Better for team collaboration
- Scales well as app grows

---

### 2. Container/Presentational Pattern

Separate logic from UI:

```typescript
// Container (logic)
function RestaurantListContainer() {
  const { restaurants, isLoading } = useRestaurants();
  
  if (isLoading) return <Spinner />;
  
  return <RestaurantList restaurants={restaurants} />;
}

// Presentational (pure UI)
function RestaurantList({ restaurants }) {
  return (
    <div>
      {restaurants.map(r => <RestaurantCard key={r.id} {...r} />)}
    </div>
  );
}
```

---

### 3. Composition Pattern

Build complex UIs from small, composable pieces:

```typescript
<DashboardLayout>
  <DashboardHeader user={user} />
  <DashboardStats data={stats} />
  <RestaurantSection>
    <RestaurantList restaurants={restaurants} />
  </RestaurantSection>
</DashboardLayout>
```

---

### 4. Custom Hooks Pattern

Extract ALL logic into hooks (your data layer):

```typescript
// hooks/useRestaurantManagement.ts
export function useRestaurantManagement() {
  const restaurants = useQuery(api.restaurants.list);
  const create = useMutation(api.restaurants.create);
  const update = useMutation(api.restaurants.update);
  
  return {
    restaurants,
    createRestaurant: create,
    updateRestaurant: update,
    isLoading: restaurants === undefined,
  };
}
```

---

## Modern Next.js Architecture

```
┌─────────────────────────────────────┐
│         App Router (Routes)          │  ← Server Components by default
│         app/dashboard/page.tsx       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Feature Components              │  ← Client Components when needed
│      features/dashboard/             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Custom Hooks                 │  ← Data fetching & business logic
│      hooks/useDashboardData.ts      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       API Layer (Convex/tRPC)       │  ← Backend queries/mutations
│      convex/restaurants.ts          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Database                    │
└─────────────────────────────────────┘
```

---

## Recommended Structure for Dashboard App

```
src/
├── app/
│   └── dashboard/
│       ├── page.tsx                    ← Server Component (minimal)
│       └── restaurants/
│           ├── page.tsx
│           └── [id]/
│               └── page.tsx
│
├── features/
│   └── dashboard/
│       ├── components/
│       │   ├── DashboardContainer.tsx  ← "Controller" equivalent
│       │   ├── DashboardStats.tsx
│       │   ├── RestaurantList.tsx
│       │   └── RestaurantCard.tsx
│       ├── hooks/
│       │   ├── useDashboardData.ts     ← "Model" equivalent
│       │   └── useRestaurantActions.ts
│       └── types.ts
│
├── convex/                              ← Your actual "backend"
│   ├── restaurants.ts
│   └── users.ts
│
└── shared/
    ├── components/ui/
    └── hooks/
```

---

## Quick Rules

### ✅ DO:
- Organize by feature/domain
- Use custom hooks for all data/logic
- Keep components small and focused
- Separate Server Components from Client Components
- Co-locate related code

### ❌ DON'T:
- Use MVC terminology (confusing in React context)
- Separate by technical role (all components in one folder)
- Put business logic in components
- Create "controller" or "service" classes

---

## Component Refactoring Best Practices

### Extract Custom Hooks for Data Logic

**Before:**
```typescript
function DashboardContainer() {
  const { user, isLoaded, isSignedIn } = useUser();
  const currentUser = useQuery(api.users.getCurrentUserQuery, isSignedIn ? {} : "skip");
  const restaurants = useQuery(api.restaurants.getMyRestaurants, isSignedIn ? {} : "skip");
  
  // ... lots of logic
}
```

**After:**
```typescript
// hooks/useDashboardData.ts
export function useDashboardData() {
  const { user, isLoaded, isSignedIn } = useUser();
  const currentUser = useQuery(api.users.getCurrentUserQuery, isSignedIn ? {} : "skip");
  const restaurants = useQuery(api.restaurants.getMyRestaurants, isSignedIn ? {} : "skip");

  return {
    user,
    isLoaded,
    isSignedIn,
    currentUser,
    restaurants,
    isLoading: !isLoaded || (isSignedIn && currentUser === undefined),
    needsSync: isSignedIn && currentUser === null,
  };
}

// components/DashboardContainer.tsx
function DashboardContainer() {
  const { user, isLoading, needsSync, restaurants } = useDashboardData();
  // ... clean component logic
}
```

### Extract Reusable UI Components

Break down large components into smaller, focused ones:

```typescript
// Instead of one large component with everything:
function Dashboard() {
  return (
    <div>
      {/* 200 lines of JSX */}
    </div>
  );
}

// Break it down:
function Dashboard() {
  return (
    <div>
      <DashboardHeader />
      <DashboardStats />
      <RestaurantList />
    </div>
  );
}
```

### Create Dedicated State Components

```typescript
// DashboardStates.tsx
export const DashboardStates = {
  Loading: () => <Spinner />,
  NotSignedIn: () => <SignInPrompt />,
  NeedsSync: () => <SyncUserButton />,
};

// Usage
if (isLoading) return <DashboardStates.Loading />;
if (!isSignedIn) return <DashboardStates.NotSignedIn />;
```

---

## Next.js Server Actions vs API Routes

### Use Server Actions When:

1. **Form submissions and mutations directly from components**
   - Handling form data without needing a separate API endpoint
   - Simple CRUD operations triggered by user interactions
   - Progressive enhancement (forms work without JavaScript)

2. **Component-level data mutations**
   - Updating data from Client Components without building API routes
   - Deleting items, toggling states, updating records
   - Actions tightly coupled to specific UI components

3. **You want simplicity and co-location**
   - Logic lives close to where it's used
   - Less boilerplate than creating API routes
   - Automatically get CSRF protection and type safety

**Example:**
```typescript
async function updateProfile(formData: FormData) {
  'use server'
  const name = formData.get('name')
  await db.user.update({...})
  revalidatePath('/profile')
}
```

### Use API Routes When:

1. **External API consumption**
   - Webhooks from third-party services (Stripe, GitHub, etc.)
   - Public APIs that external clients need to call
   - Mobile apps or other frontends consuming your backend

2. **Complex HTTP requirements**
   - Need specific HTTP methods, headers, or status codes
   - Streaming responses or special content types
   - Rate limiting, custom middleware, or authentication flows

3. **RESTful or standardized APIs**
   - Building a proper REST API for multiple clients
   - Need standard HTTP semantics and responses
   - OpenAPI/Swagger documentation

4. **Non-form-based integrations**
   - Cron jobs hitting endpoints
   - Server-to-server communication
   - OAuth callbacks and redirects

**Example:**
```typescript
// app/api/webhook/stripe/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  // Verify webhook, return proper status codes
  return Response.json({ received: true })
}
```

### Rule of Thumb

- **Internal app logic + forms?** → Server Actions
- **External clients or webhooks?** → API Routes
- **Need HTTP control or public endpoint?** → API Routes
- **Simple mutation from component?** → Server Actions

---

## Summary

Modern Next.js/React apps don't use MVC. Instead, they use:

1. **Feature-based architecture** - organize by domain, not technical role
2. **Custom hooks** - for all data fetching and business logic
3. **Component composition** - build UIs from small, reusable pieces
4. **Server/Client Component separation** - leverage Next.js App Router
5. **Server Actions** - for internal mutations and form handling
6. **API Routes** - for external integrations and webhooks

This approach is more maintainable, scalable, and aligned with React's component-based philosophy.