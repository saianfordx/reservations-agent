# Roles and Permissions Guide

This guide shows you how to use Clerk's role-based access control (RBAC) with Convex in this application.

## Overview

The app uses **Clerk for authentication and permissions** and **Convex for data storage**. Roles and permissions are:
1. Defined in Clerk Dashboard
2. Automatically synced to Convex
3. Checked on both frontend and backend

## Default Roles

Clerk provides two default roles out of the box:

| Role | Clerk Key | Description |
|------|-----------|-------------|
| Admin | `org:admin` | Full access to organization and all resources |
| Member | `org:member` | Limited access, can read but not modify settings |

## Custom Roles (Optional)

You can create custom roles in Clerk Dashboard (requires paid plan):

### Example Custom Roles

```
org:manager    - Can manage restaurants and reservations
org:viewer     - Read-only access to all data
org:agent      - Can manage AI agents only
```

### Creating Custom Roles

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Roles**
3. Click **Create new role**
4. Enter:
   - **Name**: Manager
   - **Key**: `org:manager`
   - **Description**: Can manage restaurants

## Custom Permissions

Permissions define specific actions users can perform. Use the format: `org:<resource>:<action>`

### Example Permissions

```
org:restaurants:create    - Can create restaurants
org:restaurants:delete    - Can delete restaurants
org:agents:create         - Can create AI agents
org:agents:delete         - Can delete AI agents
org:reservations:cancel   - Can cancel reservations
org:billing:manage        - Can manage billing
```

### Creating Custom Permissions

1. Go to Clerk Dashboard → **Permissions**
2. Click **Create new permission**
3. Enter permission key (e.g., `org:restaurants:create`)
4. Assign to roles

## Using Permissions in Your App

### 1. Frontend Permission Checks

Use the `useOrganizationData` hook to check permissions in React components:

```typescript
import { useOrganizationData } from '@/features/organizations/hooks';

function RestaurantActions() {
  const {
    isAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  } = useOrganizationData();

  // Check if user is admin
  if (isAdmin) {
    return <AdminPanel />;
  }

  // Check specific permission
  const canCreateRestaurant = hasPermission('org:restaurants:create');

  // Check if user has ANY of these permissions
  const canManageRestaurants = hasAnyPermission([
    'org:restaurants:create',
    'org:restaurants:update',
    'org:restaurants:delete',
  ]);

  // Check if user has ALL of these permissions
  const canFullyManage = hasAllPermissions([
    'org:restaurants:create',
    'org:restaurants:delete',
  ]);

  return (
    <div>
      {canCreateRestaurant && (
        <button>Create Restaurant</button>
      )}
      {canManageRestaurants && (
        <button>Manage Restaurants</button>
      )}
    </div>
  );
}
```

### 2. Backend Permission Checks (Convex)

Check permissions in Convex mutations/queries:

```typescript
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const deleteRestaurant = mutation({
  args: {
    restaurantId: v.id('restaurants'),
    userId: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user has permission
    const canDelete = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_clerk_org_and_user', (q) =>
        q.eq('clerkOrganizationId', args.organizationId)
         .eq('clerkUserId', args.userId)
      )
      .first();

    if (!canDelete) {
      throw new Error('Not a member of this organization');
    }

    // Check if admin or has specific permission
    const isAdmin = canDelete.role === 'org:admin';
    const hasDeletePermission = canDelete.permissions.includes('org:restaurants:delete');

    if (!isAdmin && !hasDeletePermission) {
      throw new Error('You do not have permission to delete restaurants');
    }

    // Delete the restaurant
    await ctx.db.delete(args.restaurantId);
  },
});
```

### 3. Using Convex Helper Functions

The app provides helper functions for permission checks:

```typescript
import { hasPermission } from '@/convex/organizations';

// In a Convex mutation
export const updateAgent = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const canUpdate = await hasPermission(ctx, {
      clerkUserId: args.userId,
      clerkOrganizationId: args.orgId,
      permission: 'org:agents:update',
    });

    if (!canUpdate) {
      throw new Error('Permission denied');
    }

    // Update agent...
  },
});
```

## Permission Check Examples

### Example 1: Conditional Rendering

```typescript
function DeleteRestaurantButton({ restaurantId }) {
  const { hasPermission } = useOrganizationData();

  if (!hasPermission('org:restaurants:delete')) {
    return null; // Don't show button
  }

  return (
    <button onClick={() => deleteRestaurant(restaurantId)}>
      Delete
    </button>
  );
}
```

### Example 2: Role-Based UI

```typescript
function Dashboard() {
  const { userRole, isAdmin } = useOrganizationData();

  return (
    <div>
      {isAdmin && <AdminDashboard />}
      {userRole === 'org:manager' && <ManagerDashboard />}
      {userRole === 'org:member' && <MemberDashboard />}
    </div>
  );
}
```

### Example 3: Multiple Permission Check

```typescript
function BillingSection() {
  const { hasAllPermissions } = useOrganizationData();

  const canManageBilling = hasAllPermissions([
    'org:billing:read',
    'org:billing:manage',
  ]);

  if (!canManageBilling) {
    return <p>You don't have access to billing</p>;
  }

  return <BillingManagement />;
}
```

## Setting Up Permissions

### Step 1: Define Roles in Clerk

1. Go to Clerk Dashboard
2. Navigate to **Organizations → Roles**
3. Create custom roles with descriptive names

### Step 2: Define Permissions

1. Go to **Organizations → Permissions**
2. Create permissions for each action
3. Follow naming convention: `org:<resource>:<action>`

### Step 3: Assign Permissions to Roles

1. Edit each role
2. Select which permissions the role should have
3. Admins automatically get all permissions

### Step 4: Assign Roles to Users

When inviting users:
- Select their role in the invitation
- Users can be reassigned roles later

## Permission Syncing

Permissions are automatically synced from Clerk to Convex:

1. **When**: On every page load (via `useOrganizationSync`)
2. **What**: User's role + array of permission strings
3. **Where**: Stored in `organizationMemberships` table

## Best Practices

### 1. Always Check Permissions

✅ **Do:**
```typescript
const canDelete = hasPermission('org:restaurants:delete');
if (canDelete) {
  // Delete logic
}
```

❌ **Don't:**
```typescript
// Assuming user has permission without checking
deleteRestaurant(id);
```

### 2. Check on Both Frontend and Backend

Frontend checks improve UX (hide buttons user can't use), but backend checks are critical for security.

```typescript
// Frontend (UX)
{hasPermission('org:restaurants:create') && <CreateButton />}

// Backend (Security) - Always validate!
if (!hasPermission(...)) throw new Error('Permission denied');
```

### 3. Use Descriptive Permission Names

✅ **Good:**
```
org:restaurants:create
org:agents:delete
org:billing:manage
```

❌ **Bad:**
```
org:action1
org:perm2
org:do_thing
```

### 4. Group Related Permissions

For complex features, create permission groups:

```typescript
const RESTAURANT_PERMISSIONS = {
  create: 'org:restaurants:create',
  update: 'org:restaurants:update',
  delete: 'org:restaurants:delete',
  read: 'org:restaurants:read',
};

// Usage
const canManage = hasAnyPermission([
  RESTAURANT_PERMISSIONS.create,
  RESTAURANT_PERMISSIONS.update,
  RESTAURANT_PERMISSIONS.delete,
]);
```

## Common Permission Patterns

### Full CRUD Permissions

```typescript
org:restaurants:create
org:restaurants:read
org:restaurants:update
org:restaurants:delete
```

### Admin-Only Actions

```typescript
org:organization:delete
org:billing:manage
org:members:remove
```

### Read-Only Permissions

```typescript
org:restaurants:read
org:reservations:read
org:analytics:read
```

## Troubleshooting

### Permissions Not Syncing

If permissions aren't updating:
1. Check Clerk Dashboard - ensure permissions are assigned
2. Refresh the page (triggers sync)
3. Check browser console for sync errors

### User Can't Perform Action

1. Verify role in Clerk Dashboard
2. Check if role has required permission
3. Verify sync happened (check Convex dashboard)
4. Check permission string matches exactly

## Next Steps

- [ ] Define your custom roles in Clerk
- [ ] Create permissions for your resources
- [ ] Assign permissions to roles
- [ ] Add permission checks to sensitive operations
- [ ] Test with different roles

Remember: **Admins always have all permissions**, even custom ones!
