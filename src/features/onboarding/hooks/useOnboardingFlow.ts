import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

export type OnboardingStep = 'organization' | 'restaurant' | 'agent' | 'complete';

export function useOnboardingFlow() {
  const { user, isLoaded: isUserLoaded } = useUser();

  // Get user's organizations from Convex DB
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user?.id ? { clerkUserId: user.id } : 'skip'
  );

  // Get first org's onboarding status if they have any orgs
  const firstOrg = userOrganizations?.[0];
  const onboardingStatus = useQuery(
    api.organizations.getOnboardingStatus,
    firstOrg?.clerkOrganizationId ? { clerkOrganizationId: firstOrg.clerkOrganizationId } : 'skip'
  );

  // Determine current step
  const getCurrentStep = (): OnboardingStep | null => {
    if (!isUserLoaded || userOrganizations === undefined) {
      return null; // Still loading
    }

    // No organizations → Step 1: Create organization
    if (!userOrganizations || userOrganizations.length === 0) {
      return 'organization';
    }

    // Has organizations → Check onboarding status
    if (!onboardingStatus) {
      return null; // Still loading status
    }

    // Onboarding is complete → Done!
    if (onboardingStatus.completed) {
      return 'complete';
    }

    // Onboarding incomplete - determine which step to resume
    if (!onboardingStatus.hasRestaurant) {
      return 'restaurant';
    }

    if (!onboardingStatus.hasAgent) {
      return 'agent';
    }

    // Has org, restaurant, and agent but not marked complete (edge case)
    return 'complete';
  };

  const currentStep = getCurrentStep();

  return {
    currentStep,
    isLoading: currentStep === null,
    firstOrg,
    onboardingStatus,
    userOrganizations,
  };
}
