# Clerk Organizations Integration

This document explains how Clerk Organizations are integrated with Convex in this application.

## Overview

The application uses **Clerk Organizations** to enable multi-tenancy. Users can create organizations, invite team members, and manage permissions. All data (restaurants, agents, reservations) belongs to an organization rather than individual users.

## Architecture

### 1. Clerk (Frontend/Auth)

Clerk handles:
- Organization creation
- User invitations
- Role management (admin, member)
- Organization switching UI

### 2. Convex (Backend/Database)

Convex stores:
- Organizations (synced from Clerk)
- Organization memberships (synced from Clerk)
- All data scoped to organizations (restaurants, agents, reservations)

## Database Schema

### Organizations Table

```typescript
organizations: defineTable({
  clerkOrganizationId: v.string(),  // Clerk's org ID
  name: v.string(),
  slug: v.string(),
  imageUrl: v.optional(v.string()),
  createdBy: v.id('users'),
  subscriptionTier: v.string(),     // free, pro, enterprise
  subscriptionStatus: v.string(),   // active, cancelled, past_due
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### Organization Memberships Table

```typescript
organizationMemberships: defineTable({
  organizationId: v.id('organizations'),
  userId: v.id('users'),
  clerkOrganizationId: v.string(),
  clerkUserId: v.string(),
  role: v.string(),                  // admin, member
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### Updated Tables

All resource tables now use `organizationId` instead of `ownerId`:

- `restaurants.organizationId`
- `agents.organizationId`
- (Reservations still use `restaurantId`)

## How It Works

### 1. Organization Sync

When a user switches organizations or creates a new one, the `useOrganizationSync` hook automatically syncs the organization data from Clerk to Convex.

**File:** `src/features/organizations/hooks/useOrganizationSync.ts`

```typescript
export function useOrganizationSync() {
  // Automatically syncs when organization or user changes
  useEffect(() => {
    syncOrganization(...)
    syncMembership(...)
  }, [organization, user])
}
```

**Usage:** Called in `DashboardLayout` so it runs on every page.

### 2. Organization Data Access

Use the `useOrganizationData` hook to access organization information:

**File:** `src/features/organizations/hooks/useOrganizationData.ts`

```typescript
const {
  clerkOrganization,           // Clerk's organization object
  convexOrganization,          // Convex's synced organization
  userRole,                    // 'admin' or 'member'
  isAdmin,                     // Helper boolean
  organizationMembers,         // List of all members
} = useOrganizationData();
```

### 3. Organization Switcher UI

The `OrganizationSwitcher` component is placed in the sidebar (top-left):

**File:** `src/shared/components/layout/DashboardLayout.tsx`

```typescript
<OrganizationSwitcher
  hidePersonal
  appearance={{...}}
/>
```

- **hidePersonal**: Disables personal accounts (only organizations allowed)
- Users can switch between organizations they belong to
- Users can create new organizations
- Admins can manage organization settings

## Permissions

### Role-Based Access Control (RBAC)

Clerk provides two default roles:

1. **Admin**: Full access to organization settings, can invite/remove members
2. **Member**: Regular access to organization resources

### Convex Permissions

You can check permissions in Convex functions:

```typescript
// Example: Only admins can delete restaurants
export const deleteRestaurant = mutation({
  handler: async (ctx, args) => {
    const role = await getUserOrganizationRole({
      clerkUserId: args.userId,
      clerkOrganizationId: args.orgId,
    });

    if (role !== 'admin') {
      throw new Error('Only admins can delete restaurants');
    }

    // Delete restaurant...
  },
});
```

## Setting Up Clerk Organizations

### 1. Enable Organizations in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Organizations** in the sidebar
3. Click **Enable Organizations**
4. Configure settings:
   - ✅ Allow users to create organizations
   - ✅ Disable personal accounts (if you want organization-only mode)
   - Set max members per organization

### 2. Invite Users

Users can invite others in two ways:

**Option A: Through the OrganizationSwitcher UI**
- Click organization name → Manage organization → Invite
- Enter email address
- Select role (Admin/Member)
- Send invitation

**Option B: Programmatically (if needed)**
```typescript
await clerk.organizations.createInvitation({
  organizationId: 'org_...',
  emailAddress: 'user@example.com',
  role: 'member',
});
```

## Usage Examples

### Example 1: Get User's Organizations

```typescript
import { useOrganizationData } from '@/features/organizations/hooks';

function OrganizationList() {
  const { userOrganizations } = useOrganizationData();

  return (
    <ul>
      {userOrganizations?.map(org => (
        <li key={org._id}>{org.name} - {org.role}</li>
      ))}
    </ul>
  );
}
```

### Example 2: Check if User is Admin

```typescript
import { useOrganizationData } from '@/features/organizations/hooks';

function RestaurantSettings() {
  const { isAdmin } = useOrganizationData();

  if (!isAdmin) {
    return <p>Only admins can access settings</p>;
  }

  return <SettingsForm />;
}
```

### Example 3: Get Organization Members

```typescript
import { useOrganizationData } from '@/features/organizations/hooks';

function MembersList() {
  const { organizationMembers } = useOrganizationData();

  return (
    <ul>
      {organizationMembers?.map(member => (
        <li key={member._id}>
          {member.name} - {member.role}
        </li>
      ))}
    </ul>
  );
}
```

## Migration Notes

### Before (User-Owned Resources)

```typescript
// Old schema
restaurants: defineTable({
  ownerId: v.id('users'),  // ❌ Old way
  ...
})

// Old query
const restaurants = await ctx.db
  .query('restaurants')
  .withIndex('by_owner', q => q.eq('ownerId', userId))
  .collect();
```

### After (Organization-Owned Resources)

```typescript
// New schema
restaurants: defineTable({
  organizationId: v.id('organizations'),  // ✅ New way
  ...
})

// New query
const restaurants = await ctx.db
  .query('restaurants')
  .withIndex('by_organization', q => q.eq('organizationId', orgId))
  .collect();
```

## Important Notes

1. **Personal Accounts Disabled**: The `hidePersonal` prop on `OrganizationSwitcher` means users MUST create or join an organization to use the app.

2. **Auto-Sync**: Organizations and memberships are automatically synced from Clerk to Convex whenever the user switches organizations or the component mounts.

3. **Permissions**: Clerk handles authentication and basic role management. You can implement custom permissions in Convex based on the synced role.

4. **Subscription Management**: Subscriptions are managed at the organization level in Convex (not the user level).

## Next Steps

- [ ] Update existing Convex queries to use `organizationId` instead of `ownerId`
- [ ] Add permission checks to mutation functions
- [ ] Implement custom permissions if needed (beyond admin/member)
- [ ] Add organization settings page
- [ ] Add billing/subscription management per organization
