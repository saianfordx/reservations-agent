'use client';

import { useState, useEffect } from 'react';
import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useOrganizationSync } from '@/features/organizations/hooks';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { useOnboardingFlow } from '@/features/onboarding/hooks/useOnboardingFlow';
import { RestaurantWizard } from '@/features/restaurants/components/RestaurantWizard';
import { useRouter } from 'next/navigation';
import { useOrganization, useOrganizationList } from '@clerk/nextjs';
import { RestaurantFormData } from '@/features/restaurants/types/restaurant.types';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { CustomOrganizationSwitcher } from './OrganizationSwitcher';
import { OrganizationOnboarding } from '@/features/organizations/components/OrganizationOnboarding';
import { NoRestaurantAccessModal } from './NoRestaurantAccessModal';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSelectedRestaurant } from '@/contexts/SelectedRestaurantContext';
import { useNavigationItems } from '@/features/navigation/hooks/useNavigationItems';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user } = useUser();
  const { createOrganization, setActive } = useOrganizationList();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [orgError, setOrgError] = useState<string | null>(null);

  // Get selected restaurant from context
  const { selectedRestaurantId, setSelectedRestaurantId } = useSelectedRestaurant();

  // Get filtered navigation items based on user permissions
  const { navigation, showAllBusinesses } = useNavigationItems(selectedRestaurantId);

  // Sync URL-based restaurant ID with context
  useEffect(() => {
    // Check if we're on the "All Businesses" view
    if (pathname === '/dashboard') {
      // Clear selection when on "All" view
      if (selectedRestaurantId !== null) {
        setSelectedRestaurantId(null);
      }
      return;
    }

    // Check if we're on a restaurant-specific page
    const restaurantIdMatch = pathname?.match(/^\/dashboard\/([a-z0-9]+)(?:\/|$)/);
    const urlRestaurantId = restaurantIdMatch && restaurantIdMatch[1] !== 'restaurants' && restaurantIdMatch[1] !== 'reservations' && restaurantIdMatch[1] !== 'usage' && restaurantIdMatch[1] !== 'agents'
      ? restaurantIdMatch[1]
      : null;

    // Update context when URL contains a restaurant ID
    if (urlRestaurantId && urlRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(urlRestaurantId);
    }
  }, [pathname, selectedRestaurantId, setSelectedRestaurantId]);

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Sync organization with Convex in background (non-blocking)
  // This runs silently and Convex queries will reactively update when sync completes
  useOrganizationSync();

  // Fetch restaurants - will update automatically when sync completes
  const { restaurants, createRestaurant } = useRestaurants();

  // Check onboarding using the new hook
  const { currentStep: onboardingStep } = useOnboardingFlow();

  // Redirect to onboarding if needed
  useEffect(() => {
    // Don't redirect if already on onboarding page
    if (pathname?.includes('/onboarding')) return;

    // If onboarding is not complete, redirect to onboarding
    if (onboardingStep && onboardingStep !== 'complete') {
      console.log('Redirecting to onboarding, current step:', onboardingStep);
      router.push('/onboarding');
    }
  }, [onboardingStep, pathname, router]);

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

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      setOrgError('Please enter an organization name');
      return;
    }

    if (!createOrganization || !setActive) {
      setOrgError('Unable to create organization');
      return;
    }

    try {
      setIsCreating(true);
      setOrgError(null);
      const newOrg = await createOrganization({ name: newOrgName });

      if (newOrg) {
        await setActive({ organization: newOrg.id });
      }

      setNewOrgName('');
      setIsCreateOrgOpen(false);
    } catch (error) {
      console.error('Failed to create organization:', error);
      setOrgError('Failed to create organization. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading state only while checking auth (not syncing)
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


  // Render minimal layout for onboarding pages
  if (pathname?.includes('/onboarding')) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Check if user is a member (not admin) with no restaurant access
  const isUserMember = organization && user && user.organizationMemberships?.find(
    (m) => m.organization.id === organization.id
  );
  const isOrgMember = isUserMember && isUserMember.role === 'org:member';
  const hasNoRestaurantAccess = !restaurants || restaurants.length === 0;

  // Show "No Access" modal for members with zero restaurant access
  if (isOrgMember && hasNoRestaurantAccess) {
    return <NoRestaurantAccessModal />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#000000] border-b border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:bg-white/10 p-2 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/theaccount.png"
              alt="AI Reservations"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-80 bg-[#000000] transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col pt-16">
          {/* Organization Switcher */}
          <div className="border-b border-white/10 p-4">
            <CustomOrganizationSwitcher onCreateOrganization={() => {
              setIsCreateOrgOpen(true);
              setIsMobileMenuOpen(false);
            }} />
          </div>

          {/* Restaurant Icons Section */}
          <div className="border-b border-white/10 p-4">
            <h3 className="text-white text-sm font-medium mb-3">Restaurants</h3>
            <div className="grid grid-cols-4 gap-3">
              {/* All Businesses Option */}
              {showAllBusinesses && restaurants && restaurants.length > 0 && (
                <button
                  onClick={() => {
                    router.push('/dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-xl transition-all',
                    !selectedRestaurantId
                      ? 'bg-primary/20 shadow-[0_2px_8px_rgba(253,224,71,0.3)]'
                      : 'hover:bg-white/10'
                  )}
                  title="All Businesses"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">All</span>
                  </div>
                </button>
              )}

              {restaurants?.map((restaurant) => (
                <button
                  key={restaurant._id}
                  onClick={() => {
                    router.push(`/dashboard/${restaurant._id}`);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-xl transition-all',
                    selectedRestaurantId === restaurant._id
                      ? 'bg-primary/20 shadow-[0_2px_8px_rgba(253,224,71,0.3)]'
                      : 'hover:bg-white/10'
                  )}
                  title={restaurant.name}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {restaurant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white text-xs mt-1 truncate w-full text-center">
                    {restaurant.name}
                  </span>
                </button>
              ))}

              <button
                onClick={() => {
                  setIsWizardOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary/90 transition-all shadow-[0_4px_12px_rgba(253,224,71,0.3)]"
                title="Create New Business"
              >
                <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
                  <span className="text-xl text-black">+</span>
                </div>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 px-4 pt-6 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all w-full',
                    pathname === item.href
                      ? 'bg-primary text-black shadow-[0_4px_12px_rgba(253,224,71,0.4)]'
                      : 'text-white hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* User Button */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center rounded-xl px-4 py-3">
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col h-screen">
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
              <CustomOrganizationSwitcher onCreateOrganization={() => setIsCreateOrgOpen(true)} />
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-16 bg-[#000000] lg:block shadow-[2px_0_8px_rgba(0,0,0,0.3)]">
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="space-y-2">
                  {/* All Businesses Option */}
                  {/* Only show "All" option for org admins */}
                  {showAllBusinesses && restaurants && restaurants.length > 0 && (
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
                  <UserButton />
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
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto pt-20 lg:pt-6">{children}</main>
      </div>

      {isWizardOpen && (
        <RestaurantWizard
          onSubmit={handleCreateBusiness}
          onCancel={() => setIsWizardOpen(false)}
          isLoading={isCreating}
        />
      )}

      {/* Create Organization Dialog */}
      <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage multiple restaurants and teams.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                placeholder="e.g., My Restaurant Group"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateOrganization();
                  }
                }}
              />
              {orgError && (
                <p className="text-sm text-red-500">{orgError}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOrgOpen(false);
                setNewOrgName('');
                setOrgError(null);
              }}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={isCreating || !newOrgName.trim()}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
