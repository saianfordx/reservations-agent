'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';
import { useAgents } from '@/features/agents/hooks/useAgents';
import { Button } from '@/shared/components/ui/button';
import { CreateAgentModal } from '@/features/agents/components/CreateAgentModal';
import { AgentCard } from '@/features/agents/components/AgentCard';
import { Id } from '../../../../../../convex/_generated/dataModel';

export default function RestaurantAgentsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const restaurantId = params.id as Id<'restaurants'>;
  const { restaurant, isLoading } = useRestaurant(restaurantId);
  const { agents, isLoading: agentsLoading } = useAgents(restaurantId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(isOnboarding);

  // Auth guard - redirect to sign in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading restaurant...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Restaurant not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">AI Assistants</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage AI assistants for {restaurant.name}
          </p>
        </div>
        <Button size="lg" onClick={() => setIsCreateModalOpen(true)}>
          Create AI Assistant
        </Button>
      </div>

      {/* Agents List or Empty State */}
      {agentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading agents...</div>
        </div>
      ) : !agents || agents.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold mb-2 text-black">No AI assistants yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first AI assistant to handle phone reservations
          </p>
          <Button size="lg" onClick={() => setIsCreateModalOpen(true)}>
            Create Your First AI Assistant
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              restaurantName={restaurant.name}
              restaurantTimezone={restaurant.location.timezone}
              restaurantOrganizationId={restaurant.organizationId}
            />
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      <CreateAgentModal
        restaurantId={restaurantId}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        isOnboarding={isOnboarding}
      />
    </div>
  );
}
