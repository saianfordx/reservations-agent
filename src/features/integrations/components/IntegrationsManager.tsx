'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { TheAccountIntegrationCard } from './TheAccountIntegrationCard';

interface IntegrationsManagerProps {
  restaurantId: Id<'restaurants'>;
}

export function IntegrationsManager({ restaurantId }: IntegrationsManagerProps) {
  // Query existing integrations for this restaurant
  const integrations = useQuery(api.integrations.getByRestaurant, { restaurantId });

  // Find The Account integration if it exists
  const theAccountIntegration = integrations?.find((i: { provider: string }) => i.provider === 'the_account');

  if (integrations === undefined) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <TheAccountIntegrationCard
          restaurantId={restaurantId}
          integration={theAccountIntegration}
        />

        {/* Future integrations can be added here */}
        {/* <ToastIntegrationCard ... /> */}
        {/* <SquareIntegrationCard ... /> */}
      </div>
    </div>
  );
}
