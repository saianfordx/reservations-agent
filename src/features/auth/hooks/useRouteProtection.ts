/**
 * Route Protection Hook
 *
 * Handles route-level security and smart redirects based on user permissions.
 * Following the Custom Hooks Pattern from REACT.md
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser, useOrganization } from '@clerk/nextjs';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';

interface RouteProtectionOptions {
  requiresAdmin?: boolean;
  requiresRestaurantAccess?: boolean;
  redirectTo?: string;
}

/**
 * Hook to protect routes and handle permission-based redirects
 */
export function useRouteProtection(options: RouteProtectionOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();

  // Check if user is org admin
  const userMembership = user?.organizationMemberships?.find(
    (m) => m.organization.id === organization?.id
  );
  const isOrgAdmin = userMembership?.role === 'org:admin';

  useEffect(() => {
    // Wait for all data to load
    if (!authLoaded || restaurantsLoading) return;

    // Not signed in - redirect to sign in
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    // Check admin requirement
    if (options.requiresAdmin && !isOrgAdmin) {
      // Non-admin trying to access admin-only route
      if (restaurants && restaurants.length > 0) {
        // Redirect to their first restaurant
        router.push(`/dashboard/${restaurants[0]._id}`);
      } else {
        // No access at all - stay on current page (will show no-access modal)
        return;
      }
      return;
    }

    // Check restaurant access requirement
    if (options.requiresRestaurantAccess) {
      const hasAccess = isOrgAdmin || (restaurants && restaurants.length > 0);

      if (!hasAccess) {
        // No access - will be handled by NoRestaurantAccessModal in DashboardLayout
        return;
      }
    }

    // Custom redirect
    if (options.redirectTo) {
      router.push(options.redirectTo);
      return;
    }
  }, [
    authLoaded,
    isSignedIn,
    isOrgAdmin,
    restaurants,
    restaurantsLoading,
    options.requiresAdmin,
    options.requiresRestaurantAccess,
    options.redirectTo,
    router,
    pathname,
  ]);

  return {
    isLoading: !authLoaded || restaurantsLoading,
    isSignedIn,
    isOrgAdmin,
    hasRestaurantAccess: isOrgAdmin || (restaurants && restaurants.length > 0),
    restaurants,
  };
}

/**
 * Hook to get the best redirect path for the current user
 * Used for post-login redirects
 */
export function useSmartRedirect() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { restaurants } = useRestaurants();

  // Check if user is org admin
  const userMembership = user?.organizationMemberships?.find(
    (m) => m.organization.id === organization?.id
  );
  const isOrgAdmin = userMembership?.role === 'org:admin';

  /**
   * Get the best path to redirect user to based on their permissions
   */
  const getRedirectPath = (): string => {
    // Admin goes to "All" view
    if (isOrgAdmin) {
      return '/dashboard';
    }

    // Member with restaurant access goes to their first restaurant
    if (restaurants && restaurants.length > 0) {
      return `/dashboard/${restaurants[0]._id}`;
    }

    // Member with no access - go to dashboard (will show no-access modal)
    return '/dashboard';
  };

  return {
    redirectPath: getRedirectPath(),
    isOrgAdmin,
    hasAccess: isOrgAdmin || (restaurants && restaurants.length > 0),
  };
}
