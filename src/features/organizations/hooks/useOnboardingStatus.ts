import { useQuery } from 'convex/react';
import { useOrganization } from '@clerk/nextjs';
import { api } from '../../../../convex/_generated/api';

export function useOnboardingStatus() {
  const { organization } = useOrganization();

  const onboardingStatus = useQuery(
    api.organizations.getOnboardingStatus,
    organization?.id ? { clerkOrganizationId: organization.id } : 'skip'
  );

  return {
    onboardingStatus,
    isLoading: onboardingStatus === undefined,
    needsOnboarding: onboardingStatus && !onboardingStatus.completed,
    currentStep: onboardingStatus?.currentStep,
  };
}
