'use client';

import { useState, useEffect } from 'react';
import { useOrganizationList, useOrganization } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { RestaurantWizard } from '@/features/restaurants/components/RestaurantWizard';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { RestaurantFormData } from '@/features/restaurants/types/restaurant.types';
import { Check, Phone } from 'lucide-react';

type OnboardingStep = 'organization' | 'restaurant' | 'agent' | 'complete';

export function OrganizationOnboarding() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { createRestaurant } = useRestaurants();
  const { userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
    }
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // If user already has organizations, skip to restaurant creation
  useEffect(() => {
    if (userMemberships && userMemberships.data && userMemberships.data.length > 0) {
      // User has organizations, redirect to restaurant creation
      router.push('/onboarding/restaurant');
    }
  }, [userMemberships, router]);

  const handleCreateRestaurant = async (data: RestaurantFormData) => {
    if (!organization?.id) {
      setError('Organization not found. Please try again.');
      return;
    }

    try {
      setIsCreating(true);
      console.log('Creating restaurant with data:', data);

      const restaurantId = await createRestaurant({
        ...data,
        clerkOrganizationId: organization.id,
      });

      console.log('Restaurant created with ID:', restaurantId);

      if (restaurantId) {
        const navigationUrl = `/dashboard/${restaurantId}/agents?onboarding=true`;
        console.log('Navigating to:', navigationUrl);

        // Use window.location for a hard navigation to ensure page loads properly
        window.location.href = navigationUrl;
      } else {
        console.error('No restaurant ID returned');
        setError('Failed to create restaurant. Please try again.');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create restaurant:', error);
      setError(`Failed to create restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCreating(false);
    }
  };

  // Show loading while checking memberships
  if (!userMemberships || userMemberships.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no organizations, prompt to create one via Clerk
  if (!userMemberships.data || userMemberships.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="max-w-md text-center space-y-6 p-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Welcome to AI Reservations!</h2>
            <p className="text-muted-foreground">
              Create an organization to get started.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use the organization switcher above to create a new organization.
            </p>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
