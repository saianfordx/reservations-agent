/**
 * Migration: Update Restaurant Access Permissions
 *
 * This migration updates all restaurant access records to recalculate
 * permissions based on their current role. This ensures that any changes
 * to the permission definitions in permissions.ts are reflected in the
 * existing access records.
 *
 * Run this migration after updating role permissions in permissions.ts
 */

import { internalMutation } from '../_generated/server';
import { getPermissionsForRole } from '../permissions';

export const updateAllRestaurantAccessPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('Starting migration: updateAllRestaurantAccessPermissions');

    // Get all restaurant access records
    const accessRecords = await ctx.db.query('restaurantAccess').collect();

    console.log(`Found ${accessRecords.length} access records to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const access of accessRecords) {
      // Recalculate permissions based on current role
      const newPermissions = getPermissionsForRole(access.role);

      // Check if permissions have changed
      const currentPermissions = access.permissions || [];
      const hasChanged =
        currentPermissions.length !== newPermissions.length ||
        !currentPermissions.every(p => newPermissions.includes(p));

      if (hasChanged) {
        console.log(`Updating access for user ${access.userId} in restaurant ${access.restaurantId}`);
        console.log(`  Role: ${access.role}`);
        console.log(`  Old permissions: ${currentPermissions.join(', ')}`);
        console.log(`  New permissions: ${newPermissions.join(', ')}`);

        await ctx.db.patch(access._id, {
          permissions: newPermissions,
          updatedAt: Date.now(),
        });

        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('Migration complete!');
    console.log(`  Updated: ${updatedCount} records`);
    console.log(`  Skipped (no changes): ${skippedCount} records`);

    return {
      success: true,
      total: accessRecords.length,
      updated: updatedCount,
      skipped: skippedCount,
    };
  },
});
