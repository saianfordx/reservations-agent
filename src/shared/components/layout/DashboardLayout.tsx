'use client';

import { useState, useEffect } from 'react';
import { UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useOrganizationSync, useOnboardingStatus } from '@/features/organizations/hooks';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { RestaurantWizard } from '@/features/restaurants/components/RestaurantWizard';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { RestaurantFormData } from '@/features/restaurants/types/restaurant.types';
import { LayoutDashboard, Store, Calendar, BarChart3, ChevronLeft, ChevronRight, Bot, Settings } from 'lucide-react';
import { CustomOrganizationSwitcher } from './OrganizationSwitcher';
import { OrganizationOnboarding } from '@/features/organizations/components/OrganizationOnboarding';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Businesses', href: '/dashboard/restaurants', icon: Store },
  { name: 'Reservations', href: '/dashboard/reservations', icon: Calendar },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
];

const getRestaurantNavigation = (restaurantId: string) => [
  { name: 'Dashboard', href: `/dashboard/${restaurantId}`, icon: LayoutDashboard },
  { name: 'Agents', href: `/dashboard/${restaurantId}/agents`, icon: Bot },
  { name: 'Reservations', href: `/dashboard/${restaurantId}/reservations`, icon: Calendar },
  { name: 'Configure', href: `/dashboard/${restaurantId}/configure`, icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Only fetch restaurants if authenticated
  const { restaurants, createRestaurant } = useRestaurants();

  // Sync organization with Convex (only if authenticated)
  useOrganizationSync();

  // Check onboarding status
  const { onboardingStatus, isLoading: onboardingLoading } = useOnboardingStatus();

  // Redirect to appropriate onboarding step if needed (ONLY FOR ADMINS)
  useEffect(() => {
    if (!organization || onboardingLoading || !onboardingStatus) return;

    // If already in onboarding or completion flow, don't redirect
    if (pathname?.includes('/onboarding') || pathname?.includes('/agents')) return;

    // Only redirect if onboarding is incomplete AND user is likely an admin
    // (members shouldn't see onboarding since org is already set up)
    if (!onboardingStatus.completed) {
      if (!onboardingStatus.hasRestaurant && restaurants?.length === 0) {
        // Need to create restaurant (admin flow)
        console.log('Redirecting to onboarding: restaurant step');
        router.push('/onboarding/restaurant');
      } else if (onboardingStatus.hasRestaurant && !onboardingStatus.hasAgent && restaurants && restaurants.length > 0) {
        // Have restaurant, need to create agent (admin flow)
        console.log('Redirecting to onboarding: agent step');
        const firstRestaurant = restaurants[0];
        router.push(`/dashboard/${firstRestaurant._id}/agents?onboarding=true`);
      }
    }
  }, [organization, onboardingStatus, onboardingLoading, pathname, restaurants, router]);

  const handleCreateBusiness = async (data: RestaurantFormData) => {
    try {
      setIsCreating(true);
      const newRestaurant = await createRestaurant({
        ...data,
        clerkOrganizationId: organization?.id,
      });
      setIsWizardOpen(false);
      if (newRestaurant) {
        router.push(`/dashboard/${newRestaurant}`);
      }
    } catch (error) {
      console.error('Failed to create restaurant:', error);
      alert('Failed to create restaurant. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading state while checking auth and org
  if (!isLoaded || !orgLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not signed in (will redirect)
  if (!isSignedIn) {
    return null;
  }

  // Show prompt to create/join organization only if user has no organizations at all
  if (!organization) {
    // This will be handled by Clerk's organization selection
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="max-w-md text-center space-y-6 p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Select an Organization</h2>
            <p className="text-muted-foreground">
              Please select an organization from the switcher above to continue.
            </p>
          </div>
          <div className="pt-4 border-t">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    );
  }

  // Check if we're on a restaurant-specific page
  const restaurantIdMatch = pathname?.match(/^\/dashboard\/([a-z0-9]+)(?:\/|$)/);
  const selectedRestaurantId = restaurantIdMatch && restaurantIdMatch[1] !== 'restaurants' && restaurantIdMatch[1] !== 'reservations' && restaurantIdMatch[1] !== 'usage'
    ? restaurantIdMatch[1]
    : null;

  // Choose navigation based on context
  const navigation = selectedRestaurantId
    ? getRestaurantNavigation(selectedRestaurantId)
    : mainNavigation;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex flex-col h-screen">
        <header className={cn(
          "bg-[#000000] border-b border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300",
          isCollapsed ? "w-[144px]" : "w-[320px]"
        )}>
          <div className="flex items-center justify-between px-4 h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/theaccount.png"
                alt="AI Reservations"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <CustomOrganizationSwitcher onCreateOrganization={() => setIsWizardOpen(true)} />
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-16 bg-[#000000] lg:block shadow-[2px_0_8px_rgba(0,0,0,0.3)]">
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="space-y-2">
                  {/* All Businesses Option */}
                  {restaurants && restaurants.length > 0 && (
                    <Link
                      href="/dashboard"
                      className={cn(
                        'flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer',
                        !selectedRestaurantId
                          ? 'bg-primary/20 shadow-[0_2px_8px_rgba(253,224,71,0.3)]'
                          : 'hover:bg-white/10'
                      )}
                      title="All Businesses"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">All</span>
                      </div>
                    </Link>
                  )}

                  {restaurants?.map((restaurant) => (
                    <Link
                      key={restaurant._id}
                      href={`/dashboard/${restaurant._id}`}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer',
                        selectedRestaurantId === restaurant._id
                          ? 'bg-primary/20 shadow-[0_2px_8px_rgba(253,224,71,0.3)]'
                          : 'hover:bg-white/10'
                      )}
                      title={restaurant.name}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {restaurant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="p-2 border-t border-white/10">
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="w-full flex flex-col items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary/90 transition-all shadow-[0_4px_12px_rgba(253,224,71,0.3)]"
                  title="Create New Business"
                >
                  <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                    <span className="text-xl text-black">+</span>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          <aside className={cn(
            "hidden bg-[#000000] lg:block shadow-[4px_0_12px_rgba(0,0,0,0.3)] transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
          )}>
            <div className="flex h-full flex-col">
              <nav className="flex-1 space-y-2 px-4 pt-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                        pathname === item.href
                          ? 'bg-primary text-black shadow-[0_4px_12px_rgba(253,224,71,0.4)]'
                          : 'text-white hover:bg-white/10 hover:text-white',
                        isCollapsed && 'justify-center px-2'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/10 space-y-2">
                <div className={cn(
                  "flex items-center rounded-xl px-4 py-3",
                  isCollapsed && 'justify-center px-2'
                )}>
                  <UserButton afterSignOutUrl="/" />
                </div>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all text-white hover:bg-white/10 w-full',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5" />
                  ) : (
                    <>
                      <ChevronLeft className="w-5 h-5 flex-shrink-0" />
                      <span>Collapse</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      {isWizardOpen && (
        <RestaurantWizard
          onSubmit={handleCreateBusiness}
          onCancel={() => setIsWizardOpen(false)}
          isLoading={isCreating}
        />
      )}
    </div>
  );
}
