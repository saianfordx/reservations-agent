/**
 * Migration Runner
 *
 * This file provides a mutation that can be called from the Convex dashboard
 * or from the frontend to run migrations.
 */

import { mutation } from '../_generated/server';
import { getPermissionsForRole } from '../permissions';

/**
 * Run the restaurant access permissions migration
 *
 * To run this migration:
 * 1. Go to your Convex dashboard (https://dashboard.convex.dev)
 * 2. Select your project
 * 3. Go to "Functions" tab
 * 4. Find "migrations/runMigration:runPermissionsMigration"
 * 5. Click "Run" with empty args {}
 *
 * OR run from browser console on your app:
 * const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
 * await convex.mutation(api.migrations.runMigration.runPermissionsMigration, {})
 */
export const runPermissionsMigration = mutation({
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
      message: `Successfully updated ${updatedCount} records (${skippedCount} unchanged)`
    };
  },
});
