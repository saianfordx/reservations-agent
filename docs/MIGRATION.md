# Migration Guide: User-Owned to Organization-Owned Resources

This guide explains how to migrate from user-owned resources to organization-owned resources.

## What Changed

**Before:**
- Restaurants and agents belonged to individual users via `ownerId`

**After:**
- Restaurants and agents belong to organizations via `organizationId`
- Users access resources through organization memberships

## Migration Steps

### Step 1: Deploy with Optional organizationId

The schema has been updated to make `organizationId` optional temporarily:

```typescript
organizationId: v.optional(v.id('organizations'))
ownerId: v.optional(v.id('users')) // Kept for backward compatibility
```

This allows the deployment to succeed even though existing data has `ownerId` instead of `organizationId`.

### Step 2: Ensure Users Have Organizations

**Option A: Let users create organizations naturally**
- Users will create organizations when they log in
- The OrganizationSwitcher will prompt them to create an org
- `useOrganizationSync` will automatically sync their org to Convex

**Option B: Create default organization for existing users**
- Log in as each user
- Create an organization via the OrganizationSwitcher
- The org will be automatically synced to Convex

### Step 3: Run Migration Scripts

Once users have organizations, run the migration to update existing data:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **Functions** tab
4. Find the migration functions under `migrations.ts`

#### Run Restaurants Migration

In the Convex dashboard, run:

```javascript
// mutations:migrateRestaurantsToOrganizations
```

This will:
- Find all restaurants with `ownerId` but no `organizationId`
- Look up the user's organization membership
- Add the `organizationId` to the restaurant

#### Run Agents Migration

After restaurants are migrated, run:

```javascript
// mutations:migrateAgentsToOrganizations
```

This will:
- Find all agents with no `organizationId`
- Look up the restaurant's `organizationId`
- Add the `organizationId` to the agent

#### Or Run All Migrations at Once

```javascript
// mutations:runAllMigrations
```

### Step 4: Verify Migration

Check the migration results in the Convex dashboard logs:

```
Migration complete: X migrated, Y skipped
```

Verify in the **Data** tab that:
- All restaurants have `organizationId`
- All agents have `organizationId`

### Step 5: Make organizationId Required (Optional)

Once all data is migrated, you can make `organizationId` required again:

**Edit `convex/schema.ts`:**

```typescript
// Change from:
organizationId: v.optional(v.id('organizations'))

// To:
organizationId: v.id('organizations')
```

**Remove deprecated ownerId:**

```typescript
// Remove this line:
ownerId: v.optional(v.id('users'))
```

Then redeploy.

## Troubleshooting

### "No organization found for user"

**Cause:** User hasn't created an organization yet.

**Fix:**
1. Log in as that user
2. Use the OrganizationSwitcher to create an organization
3. Wait for sync to complete
4. Run migration again

### "Restaurant has no organizationId"

**Cause:** You ran the agents migration before the restaurants migration.

**Fix:** Run `migrateRestaurantsToOrganizations` first, then run `migrateAgentsToOrganizations`

### Migration skipped some items

**Cause:** Those items may already be migrated or have invalid data.

**Fix:** Check the logs for specific error messages, fix the data issues, then rerun the migration.

## Rollback Plan

If you need to rollback:

1. The `ownerId` field is still present in the database
2. You can temporarily switch queries back to using `ownerId`
3. Remove the organization-related code
4. Redeploy

However, this is **not recommended** as organizations provide better multi-tenancy support.

## After Migration

Once migration is complete:

1. ✅ Update all queries to use `organizationId` instead of `ownerId`
2. ✅ Remove any remaining references to `ownerId` in code
3. ✅ Test creating new restaurants/agents (they should use `organizationId`)
4. ✅ Test organization switching
5. ✅ Test inviting team members

## Need Help?

If you run into issues:
1. Check the Convex dashboard logs
2. Check browser console for errors
3. Verify organizations are syncing (check `organizations` and `organizationMemberships` tables)
