/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agents from "../agents.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as migrations_runMigration from "../migrations/runMigration.js";
import type * as migrations_updateRestaurantAccessPermissions from "../migrations/updateRestaurantAccessPermissions.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as permissions from "../permissions.js";
import type * as reservations from "../reservations.js";
import type * as restaurantAccess from "../restaurantAccess.js";
import type * as restaurants from "../restaurants.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  knowledgeBase: typeof knowledgeBase;
  "migrations/runMigration": typeof migrations_runMigration;
  "migrations/updateRestaurantAccessPermissions": typeof migrations_updateRestaurantAccessPermissions;
  migrations: typeof migrations;
  notifications: typeof notifications;
  organizations: typeof organizations;
  permissions: typeof permissions;
  reservations: typeof reservations;
  restaurantAccess: typeof restaurantAccess;
  restaurants: typeof restaurants;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
