import { useOrganization, useUser } from '@clerk/nextjs';
import { LayoutDashboard, Store, Calendar, BarChart3, Bot, Settings, ShoppingBag } from 'lucide-react';
import { useUserRestaurantAccess } from '@/features/restaurants/hooks/useRestaurantAccess';
import { Id } from '../../../../convex/_generated/dataModel';

// Main navigation items (for org admins viewing all restaurants)
const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Businesses', href: '/dashboard/restaurants', icon: Store },
  { name: 'Reservations', href: '/dashboard/reservations', icon: Calendar },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
];

// All possible restaurant navigation items with their required permissions
const allRestaurantNavItems = [
  {
    name: 'Dashboard',
    href: (id: string) => `/dashboard/${id}`,
    icon: LayoutDashboard,
    permission: 'restaurant:view'
  },
  {
    name: 'Agents',
    href: (id: string) => `/dashboard/${id}/agents`,
    icon: Bot,
    permission: 'agent:view'
  },
  {
    name: 'Reservations',
    href: (id: string) => `/dashboard/${id}/reservations`,
    icon: Calendar,
    permission: 'reservation:view'
  },
  {
    name: 'Orders',
    href: (id: string) => `/dashboard/${id}/orders`,
    icon: ShoppingBag,
    permission: 'reservation:view' // Using same permission as reservations for now
  },
  {
    name: 'Configure',
    href: (id: string) => `/dashboard/${id}/configure`,
    icon: Settings,
    permission: 'restaurant:edit'
  },
];

/**
 * Hook to determine which navigation items to show based on user's permissions
 */
export function useNavigationItems(selectedRestaurantId: string | null) {
  const { organization } = useOrganization();
  const { user } = useUser();

  // Get user's access to the selected restaurant (if any)
  const { permissions, isLoading } = useUserRestaurantAccess(
    selectedRestaurantId as Id<'restaurants'> | undefined
  );

  // Check if user is organization admin
  const userMembership = user?.organizationMemberships?.find(
    (m) => m.organization.id === organization?.id
  );
  const isOrgAdmin = userMembership?.role === 'org:admin';

  // Determine which navigation to show
  if (isLoading) {
    return {
      navigation: [],
      showAllBusinesses: false,
      isLoading: true,
    };
  }

  // If viewing "All" (no selected restaurant)
  if (!selectedRestaurantId) {
    // Only org admins can see the "All" view
    if (isOrgAdmin) {
      return {
        navigation: mainNavigation,
        showAllBusinesses: true,
        isLoading: false,
      };
    }

    // Members shouldn't be on the "All" view - return empty
    return {
      navigation: [],
      showAllBusinesses: false,
      isLoading: false,
    };
  }

  // Viewing a specific restaurant - filter nav items by permissions
  const filteredNavigation = allRestaurantNavItems
    .filter(item => {
      // Org admins can see everything
      if (isOrgAdmin) return true;

      // Check if user has required permission
      return permissions.includes(item.permission);
    })
    .map(item => ({
      name: item.name,
      href: item.href(selectedRestaurantId),
      icon: item.icon,
    }));

  return {
    navigation: filteredNavigation,
    showAllBusinesses: isOrgAdmin, // Only admins see the "All" option
    isLoading: false,
  };
}
