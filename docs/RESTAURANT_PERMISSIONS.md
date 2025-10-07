# Restaurant Permission System

This document describes the multi-level permission system for controlling access to restaurants within organizations.

## Overview

The permission system operates on **two levels**:

1. **Organization Level**: Controls what users can do across the entire organization
2. **Restaurant Level**: Controls what users can do within specific restaurants

## Organization-Level Permissions

### Roles

#### `org:admin`
- **Full access to ALL restaurants** in the organization
- Can manage organization members
- Can create/edit/delete any restaurant
- Can grant/revoke restaurant access to other members
- Implicitly has `restaurant:owner` role for all restaurants

#### `org:member`
- **Access only to assigned restaurants**
- Cannot see restaurants they haven't been granted access to
- Permissions depend on their restaurant-level role

### How It Works

Organization roles are managed through **Clerk** and automatically synced to Convex via webhooks or the `useOrganizationSync` hook.

## Restaurant-Level Permissions

### Roles

Restaurant-level roles determine what a user can do **within a specific restaurant**:

#### `restaurant:owner`
- Full control over the restaurant
- Can manage all aspects: settings, agents, reservations
- Can grant/revoke access to other users
- Can delete the restaurant

**Permissions**:
- ✅ View restaurant
- ✅ Edit restaurant
- ✅ Delete restaurant
- ✅ Manage access (grant/revoke)
- ✅ All agent permissions
- ✅ All reservation permissions
- ✅ All analytics permissions

---

#### `restaurant:manager`
- Can manage restaurant operations
- Can create/edit agents and handle reservations
- Cannot delete the restaurant
- Cannot manage access for other users

**Permissions**:
- ✅ View restaurant
- ✅ Edit restaurant
- ❌ Delete restaurant
- ❌ Manage access
- ✅ All agent permissions
- ✅ All reservation permissions
- ✅ All analytics permissions

---

#### `restaurant:host`
- Focused on reservation management
- Can view and manage reservations
- Limited access to settings and analytics

**Permissions**:
- ✅ View restaurant
- ❌ Edit restaurant
- ❌ Delete restaurant
- ❌ Manage access
- ✅ View agents
- ❌ Create/edit/delete agents
- ✅ View reservations
- ✅ Create reservations
- ✅ Edit reservations
- ✅ Cancel reservations

---

#### `restaurant:viewer`
- Read-only access
- Can view information but cannot make changes

**Permissions**:
- ✅ View restaurant
- ❌ Edit restaurant
- ❌ Delete restaurant
- ❌ Manage access
- ✅ View agents
- ❌ Create/edit/delete agents
- ✅ View reservations
- ❌ Create/edit/cancel reservations
- ✅ View analytics
- ❌ Export data

## How Access Works

### For Organization Admins

```
org:admin
  └─ Automatic access to ALL restaurants
  └─ Implicit restaurant:owner role
  └─ Can see and manage all restaurants in sidebar
```

### For Organization Members

```
org:member
  └─ No default restaurant access
  └─ Must be explicitly granted access to each restaurant
  └─ Only sees restaurants they've been granted access to
  └─ Role per restaurant determines their permissions
```

### Example Scenario

**Organization**: "My Restaurant Group"

**Members**:
- **Alice** (org:admin)
  - Restaurant A: ✅ Full access (implicit owner)
  - Restaurant B: ✅ Full access (implicit owner)
  - Restaurant C: ✅ Full access (implicit owner)

- **Bob** (org:member)
  - Restaurant A: ✅ restaurant:manager
  - Restaurant B: ✅ restaurant:host
  - Restaurant C: ❌ No access (won't see it)

- **Carol** (org:member)
  - Restaurant A: ❌ No access
  - Restaurant B: ✅ restaurant:viewer
  - Restaurant C: ✅ restaurant:owner

## Using the Permission System

### In the UI

#### Managing Restaurant Access (Admin/Owner Only)

1. Navigate to a restaurant's configure page
2. Click on the "Members" tab
3. Click "Add Member" to grant access
4. Select the user and their role
5. Click "Add Member" to confirm

To revoke access, click the trash icon next to a member's name.

### In Code

#### Check User's Access to a Restaurant

```tsx
import { useUserRestaurantAccess } from '@/features/restaurants/hooks/useRestaurantAccess';

function MyComponent() {
  const { hasAccess, role, permissions, isImplicit } = useUserRestaurantAccess(restaurantId);

  if (!hasAccess) {
    return <div>No access to this restaurant</div>;
  }

  return (
    <div>
      <p>Your role: {role}</p>
      <p>Implicit access (org admin): {isImplicit ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

#### Check Specific Permission

```tsx
import { useRestaurantPermission } from '@/features/restaurants/hooks/useRestaurantAccess';

function EditButton() {
  const { hasPermission } = useRestaurantPermission(
    restaurantId,
    'restaurant:edit'
  );

  if (!hasPermission) return null;

  return <button>Edit Restaurant</button>;
}
```

#### Get Restaurant Members (Owner/Manager Only)

```tsx
import { useRestaurantMembers } from '@/features/restaurants/hooks/useRestaurantAccess';

function MembersList() {
  const { members, isLoading } = useRestaurantMembers(restaurantId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {members?.map((member) => (
        <li key={member._id}>
          {member.user?.name} - {member.role}
        </li>
      ))}
    </ul>
  );
}
```

#### Grant/Revoke Access (Owner/Manager Only)

```tsx
import { useRestaurantAccessManagement } from '@/features/restaurants/hooks/useRestaurantAccess';

function AccessManagement() {
  const { grantAccess, revokeAccess } = useRestaurantAccessManagement();

  const handleGrant = async () => {
    await grantAccess({
      restaurantId,
      userId,
      role: 'restaurant:host',
    });
  };

  const handleRevoke = async () => {
    await revokeAccess({
      restaurantId,
      userId,
    });
  };

  return (
    <>
      <button onClick={handleGrant}>Grant Access</button>
      <button onClick={handleRevoke}>Revoke Access</button>
    </>
  );
}
```

## Database Schema

### `restaurantAccess` Table

```typescript
{
  restaurantId: Id<'restaurants'>,      // Which restaurant
  userId: Id<'users'>,                  // Which user
  organizationId: Id<'organizations'>,  // Which organization
  role: string,                         // restaurant:owner, manager, host, viewer
  permissions: string[],                // Array of permission strings
  grantedBy: Id<'users'>,              // Who granted this access
  createdAt: number,
  updatedAt: number,
}
```

### Indexes

- `by_restaurant`: Query all members of a restaurant
- `by_user`: Query all restaurants a user has access to
- `by_restaurant_and_user`: Check specific user's access to a restaurant
- `by_organization`: Query all access records in an organization
- `by_user_and_organization`: Query user's accessible restaurants in an org

## Permission Constants

All permission constants are defined in `/convex/permissions.ts`:

```typescript
import {
  OrgRole,
  RestaurantRole,
  RestaurantPermission,
  isOrgAdmin,
  getPermissionsForRole,
} from './permissions';
```

## Best Practices

1. **Always check permissions before showing UI elements**
   - Hide buttons/links for actions users can't perform
   - Use `useRestaurantPermission` hook

2. **Validate permissions on the backend**
   - Never trust client-side checks alone
   - All mutations verify permissions in Convex

3. **Use org:admin for super users**
   - Organization admins should manage all restaurants
   - Members should be granted selective access

4. **Assign appropriate roles**
   - Owner: Restaurant manager or owner
   - Manager: Full-time staff managing operations
   - Host: Front-desk staff managing reservations
   - Viewer: Stakeholders who need read-only access

5. **Audit access regularly**
   - Review who has access to each restaurant
   - Revoke access for former employees
   - Use the Members management UI

## Migration Notes

When implementing this system:

1. Existing restaurants will remain accessible to org admins
2. Org members will need to be explicitly granted access
3. You can bulk-grant access using the Convex mutations
4. Consider creating a migration script to set initial access for existing members

## Troubleshooting

### User can't see a restaurant

**Check**:
1. Are they an org admin? (Should see all restaurants)
2. Do they have a `restaurantAccess` record for this restaurant?
3. Is their organization membership synced?

### User can't perform an action

**Check**:
1. What is their restaurant-level role?
2. Does that role have the required permission?
3. Check `permissions` array in their `restaurantAccess` record

### Admin can't manage access

**Ensure**:
1. They are `org:admin` (not `org:member`)
2. Their organization membership is synced to Convex
3. The organization is properly linked to the restaurant
