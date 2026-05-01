/**
 * Permission System for Multi-Level Access Control
 *
 * Two-level hierarchy:
 * 1. Organization Level: Admin vs Member
 * 2. Restaurant Level: Owner, Manager, Host, Viewer
 */

// ============================================
// ORGANIZATION ROLES
// ============================================

export const OrgRole = {
  ADMIN: 'org:admin',
  MEMBER: 'org:member',
} as const;

// ============================================
// RESTAURANT ROLES
// ============================================

export const RestaurantRole = {
  OWNER: 'restaurant:owner',     // Full control (org admins have this implicitly)
  MANAGER: 'restaurant:manager', // Manage restaurant, agents, reservations
  HOST: 'restaurant:host',       // View/create/edit reservations, limited settings
  VIEWER: 'restaurant:viewer',   // Read-only access
} as const;

// ============================================
// RESTAURANT PERMISSIONS
// ============================================

export const RestaurantPermission = {
  // Restaurant Management
  VIEW_RESTAURANT: 'restaurant:view',
  EDIT_RESTAURANT: 'restaurant:edit',
  DELETE_RESTAURANT: 'restaurant:delete',
  MANAGE_ACCESS: 'restaurant:manage_access', // Grant/revoke access to other users

  // Agent Management
  VIEW_AGENTS: 'agent:view',
  CREATE_AGENT: 'agent:create',
  EDIT_AGENT: 'agent:edit',
  DELETE_AGENT: 'agent:delete',

  // Reservation Management
  VIEW_RESERVATIONS: 'reservation:view',
  CREATE_RESERVATION: 'reservation:create',
  EDIT_RESERVATION: 'reservation:edit',
  DELETE_RESERVATION: 'reservation:delete',
  CANCEL_RESERVATION: 'reservation:cancel',

  // Analytics & Reports
  VIEW_ANALYTICS: 'analytics:view',
  EXPORT_DATA: 'analytics:export',

  // Integration Management
  VIEW_INTEGRATIONS: 'integration:view',
  EDIT_INTEGRATIONS: 'integration:edit',
} as const;

// ============================================
// ROLE TO PERMISSIONS MAPPING
// ============================================

export const RolePermissions = {
  [RestaurantRole.OWNER]: [
    // All permissions
    RestaurantPermission.VIEW_RESTAURANT,
    RestaurantPermission.EDIT_RESTAURANT,
    RestaurantPermission.DELETE_RESTAURANT,
    RestaurantPermission.MANAGE_ACCESS,
    RestaurantPermission.VIEW_AGENTS,
    RestaurantPermission.CREATE_AGENT,
    RestaurantPermission.EDIT_AGENT,
    RestaurantPermission.DELETE_AGENT,
    RestaurantPermission.VIEW_RESERVATIONS,
    RestaurantPermission.CREATE_RESERVATION,
    RestaurantPermission.EDIT_RESERVATION,
    RestaurantPermission.DELETE_RESERVATION,
    RestaurantPermission.CANCEL_RESERVATION,
    RestaurantPermission.VIEW_ANALYTICS,
    RestaurantPermission.EXPORT_DATA,
    RestaurantPermission.VIEW_INTEGRATIONS,
    RestaurantPermission.EDIT_INTEGRATIONS,
  ],

  [RestaurantRole.MANAGER]: [
    // Almost all permissions except delete restaurant
    RestaurantPermission.VIEW_RESTAURANT,
    RestaurantPermission.EDIT_RESTAURANT,
    RestaurantPermission.VIEW_AGENTS,
    RestaurantPermission.CREATE_AGENT,
    RestaurantPermission.EDIT_AGENT,
    RestaurantPermission.DELETE_AGENT,
    RestaurantPermission.VIEW_RESERVATIONS,
    RestaurantPermission.CREATE_RESERVATION,
    RestaurantPermission.EDIT_RESERVATION,
    RestaurantPermission.DELETE_RESERVATION,
    RestaurantPermission.CANCEL_RESERVATION,
    RestaurantPermission.VIEW_ANALYTICS,
    RestaurantPermission.EXPORT_DATA,
    RestaurantPermission.VIEW_INTEGRATIONS,
    RestaurantPermission.EDIT_INTEGRATIONS,
  ],

  [RestaurantRole.HOST]: [
    // Reservation focused - only reservations access
    RestaurantPermission.VIEW_RESERVATIONS,
    RestaurantPermission.CREATE_RESERVATION,
    RestaurantPermission.EDIT_RESERVATION,
    RestaurantPermission.CANCEL_RESERVATION,
  ],

  [RestaurantRole.VIEWER]: [
    // Read-only
    RestaurantPermission.VIEW_RESTAURANT,
    RestaurantPermission.VIEW_AGENTS,
    RestaurantPermission.VIEW_RESERVATIONS,
    RestaurantPermission.VIEW_ANALYTICS,
    RestaurantPermission.VIEW_INTEGRATIONS,
  ],
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a user has a specific permission for a restaurant
 */
export function hasRestaurantPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyRestaurantPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(perm => userPermissions.includes(perm));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllRestaurantPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: string): string[] {
  const permissions = RolePermissions[role as keyof typeof RolePermissions];
  return permissions ? [...permissions] : [];
}

/**
 * Check if user is organization admin (has access to everything)
 */
export function isOrgAdmin(orgRole: string): boolean {
  return orgRole === OrgRole.ADMIN;
}
