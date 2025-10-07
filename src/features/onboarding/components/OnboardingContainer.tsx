'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList, useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { OrganizationStep } from './OrganizationStep';
import { RestaurantStep } from './RestaurantStep';
import { AgentStep } from './AgentStep';
import { RestaurantFormData } from '@/features/restaurants/types/restaurant.types';
import { useOrganizationSync, useWaitForOrgSync } from '@/features/organizations/hooks';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';

export function OnboardingContainer() {
  const router = useRouter();
  const { user } = useUser();
  const { currentStep, isLoading, firstOrg } = useOnboardingFlow();
  const { createOrganization, setActive } = useOrganizationList();
  const updateOnboarding = useMutation(api.organizations.updateOnboardingStatus);

  // Sync organization to Convex when it becomes active
  useOrganizationSync();

  // Hook to wait for organization sync
  const { waitForOrganization } = useWaitForOrgSync(user?.id);

  const [isCreating, setIsCreating] = useState(false);

  // Handle organization creation
  const handleCreateOrganization = async (name: string) => {
    if (!createOrganization || !setActive) {
      throw new Error('Unable to create organization');
    }

    setIsCreating(true);
    try {
      const newOrg = await createOrganization({ name });

      // Set the newly created organization as active
      if (newOrg) {
        await setActive({ organization: newOrg.id });

        // Wait for organization to be synced to Convex before continuing
        // This prevents race conditions where the next step tries to query
        // organization data that hasn't been synced yet
        console.log('Waiting for organization sync to complete...');
        await waitForOrganization(newOrg.id);
        console.log('Organization sync complete, proceeding to next step');
      }

      // The sync hook and flow hook will automatically detect the new org
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };


  // Handle completion (redirect to dashboard)
  if (currentStep === 'complete' && firstOrg) {
    router.push('/dashboard');
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Render appropriate step
  switch (currentStep) {
    case 'organization':
      return (
        <OrganizationStep
          onCreateOrganization={handleCreateOrganization}
          isCreating={isCreating}
        />
      );

    case 'restaurant':
      if (!firstOrg) {
        return (
          <div className="flex items-center justify-center h-screen bg-background">
            <div className="text-red-500">Error: No organization found</div>
          </div>
        );
      }

      return (
        <RestaurantStepWrapper
          organizationId={firstOrg.clerkOrganizationId}
        />
      );

    case 'agent':
      if (!firstOrg) {
        return (
          <div className="flex items-center justify-center h-screen bg-background">
            <div className="text-red-500">Error: No organization found</div>
          </div>
        );
      }

      // Fetch restaurant from DB and pass to AgentStep
      // The CreateAgentModal already handles the onboarding flow completion
      return <AgentStepWrapper />;

    default:
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
  }
}

// Helper component to handle restaurant creation with its own hook
function RestaurantStepWrapper({ organizationId }: { organizationId: string }) {
  const { createRestaurant } = useRestaurants();
  const updateOnboarding = useMutation(api.organizations.updateOnboardingStatus);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRestaurant = async (data: RestaurantFormData) => {
    setIsCreating(true);
    try {
      const restaurantId = await createRestaurant({
        ...data,
        clerkOrganizationId: organizationId,
      });

      if (restaurantId) {
        // Update onboarding status
        await updateOnboarding({
          clerkOrganizationId: organizationId,
          hasRestaurant: true,
          currentStep: 'agent',
        });
      }
    } catch (error) {
      console.error('Failed to create restaurant:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <RestaurantStep
      organizationId={organizationId}
      onCreateRestaurant={handleCreateRestaurant}
      isCreating={isCreating}
    />
  );
}

// Helper component to fetch and pass restaurant ID to AgentStep
function AgentStepWrapper() {
  const { restaurants, isLoading } = useRestaurants();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground">Loading restaurant...</div>
      </div>
    );
  }

  const firstRestaurant = restaurants?.[0];

  if (!firstRestaurant) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-red-500">Error: No restaurant found</div>
      </div>
    );
  }

  return <AgentStep restaurantId={firstRestaurant._id} />;
}
