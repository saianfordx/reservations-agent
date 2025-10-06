'use client';

import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { RestaurantWizard } from '@/features/restaurants/components/RestaurantWizard';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import { RestaurantFormData } from '@/features/restaurants/types/restaurant.types';
import { Check } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

export default function RestaurantOnboardingPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { createRestaurant } = useRestaurants();
  const [isCreating, setIsCreating] = useState(false);
  const updateOnboarding = useMutation(api.organizations.updateOnboardingStatus);

  const handleCreateRestaurant = async (data: RestaurantFormData) => {
    if (!organization?.id) {
      return;
    }

    try {
      setIsCreating(true);
      const restaurantId = await createRestaurant({
        ...data,
        clerkOrganizationId: organization.id,
      });

      if (restaurantId) {
        // Update onboarding status
        await updateOnboarding({
          clerkOrganizationId: organization.id,
          hasRestaurant: true,
          currentStep: 'agent',
        });

        // Navigate to agent creation
        window.location.href = `/dashboard/${restaurantId}/agents?onboarding=true`;
      }
    } catch (error) {
      console.error('Failed to create restaurant:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold">2</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold">3</div>
          </div>
          <h2 className="text-3xl font-bold">Create Your Restaurant</h2>
          <p className="text-muted-foreground">
            Tell us about your business
          </p>
        </div>

        <RestaurantWizard
          onSubmit={handleCreateRestaurant}
          onCancel={() => router.push('/dashboard')}
          isLoading={isCreating}
        />
      </div>
    </div>
  );
}
