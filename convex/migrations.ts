/**
 * Migration Scripts
 *
 * These are one-time scripts to migrate data when schema changes.
 * Run these manually from the Convex dashboard after deployment.
 */

import { internalMutation } from './_generated/server';

/**
 * Migration: Add organizationId to restaurants
 *
 * This migrates restaurants from ownerId to organizationId.
 *
 * How to use:
 * 1. Deploy the code with optional organizationId
 * 2. Create an organization for each user (or manually in Clerk)
 * 3. Run this migration from Convex dashboard
 * 4. Make organizationId required again
 */
export const migrateRestaurantsToOrganizations = internalMutation({
  handler: async (ctx) => {
    // Get all restaurants that don't have organizationId yet
    const restaurants = await ctx.db
      .query('restaurants')
      .collect();

    let migratedCount = 0;
    let skippedCount = 0;

    for (const restaurant of restaurants) {
      // Skip if already has organizationId
      if (restaurant.organizationId) {
        skippedCount++;
        continue;
      }

      // Skip if no ownerId (shouldn't happen)
      if (!restaurant.ownerId) {
        console.error(`Restaurant ${restaurant._id} has no ownerId`);
        skippedCount++;
        continue;
      }

      // Get the user
      const user = await ctx.db.get(restaurant.ownerId);
      if (!user) {
        console.error(`User ${restaurant.ownerId} not found`);
        skippedCount++;
        continue;
      }

      // Find user's organization membership
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first();

      if (!membership) {
        console.error(`No organization found for user ${user._id}`);
        skippedCount++;
        continue;
      }

      // Update restaurant with organizationId
      await ctx.db.patch(restaurant._id, {
        organizationId: membership.organizationId,
      });

      migratedCount++;
    }

    console.log(`Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
    return { migratedCount, skippedCount };
  },
});

/**
 * Migration: Add organizationId to agents
 */
export const migrateAgentsToOrganizations = internalMutation({
  handler: async (ctx) => {
    const agents = await ctx.db
      .query('agents')
      .collect();

    let migratedCount = 0;
    let skippedCount = 0;

    for (const agent of agents) {
      // Skip if already has organizationId
      if (agent.organizationId) {
        skippedCount++;
        continue;
      }

      // Get the restaurant to find its organization
      const restaurant = await ctx.db.get(agent.restaurantId);
      if (!restaurant) {
        console.error(`Restaurant ${agent.restaurantId} not found`);
        skippedCount++;
        continue;
      }

      // If restaurant doesn't have organizationId yet, skip
      if (!restaurant.organizationId) {
        console.error(`Restaurant ${agent.restaurantId} has no organizationId`);
        skippedCount++;
        continue;
      }

      // Update agent with organizationId
      await ctx.db.patch(agent._id, {
        organizationId: restaurant.organizationId,
      });

      migratedCount++;
    }

    console.log(`Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
    return { migratedCount, skippedCount };
  },
});

/**
 * Run all migrations in order
 */
export const runAllMigrations = internalMutation({
  handler: async (ctx) => {
    console.log('Starting migrations...');

    // 1. Migrate restaurants first (they need organizationId)
    const restaurantsResult = await ctx.runMutation(
      'migrations:migrateRestaurantsToOrganizations' as any
    );
    console.log('Restaurants migrated:', restaurantsResult);

    // 2. Migrate agents (they depend on restaurants having organizationId)
    const agentsResult = await ctx.runMutation(
      'migrations:migrateAgentsToOrganizations' as any
    );
    console.log('Agents migrated:', agentsResult);

    console.log('All migrations complete!');
    return {
      restaurants: restaurantsResult,
      agents: agentsResult,
    };
  },
});
