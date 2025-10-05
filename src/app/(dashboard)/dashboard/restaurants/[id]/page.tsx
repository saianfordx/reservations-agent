'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';
import { useAgents } from '@/features/agents/hooks/useAgents';
import { Button } from '@/shared/components/ui/button';
import { CreateAgentModal } from '@/features/agents/components/CreateAgentModal';
import { AgentCard } from '@/features/agents/components/AgentCard';
import { Id } from '../../../../../../convex/_generated/dataModel';

export default function RestaurantDetailPage() {
  const params = useParams();
  const restaurantId = params.id as Id<'restaurants'>;
  const { restaurant, isLoading } = useRestaurant(restaurantId);
  const { agents, isLoading: agentsLoading } = useAgents(restaurantId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground/80">Loading restaurant...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground/80">Restaurant not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        {restaurant.description && (
          <p className="text-muted-foreground/80 mt-2">
            {restaurant.description}
          </p>
        )}
      </div>

      {/* AI Assistants Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">AI Assistants</h2>
            <p className="text-muted-foreground/80 mt-1">
              Create and manage AI assistants for this restaurant
            </p>
          </div>
          <Button size="lg" onClick={() => setIsCreateModalOpen(true)}>
            Create AI Assistant
          </Button>
        </div>

        {/* Agents List or Empty State */}
        {agentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground/80">Loading agents...</div>
          </div>
        ) : !agents || agents.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">No AI assistants yet</h3>
            <p className="text-muted-foreground/80 mb-6">
              Create your first AI assistant to handle phone reservations
            </p>
            <Button size="lg" onClick={() => setIsCreateModalOpen(true)}>
              Create Your First AI Assistant
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent._id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      <CreateAgentModal
        restaurantId={restaurantId}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {/* Restaurant Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Location */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Location</h3>
          <div className="space-y-2 text-sm">
            <div>{restaurant.location.address}</div>
            <div>
              {restaurant.location.city}, {restaurant.location.state}{' '}
              {restaurant.location.zipCode}
            </div>
            <div>{restaurant.location.country}</div>
            <div className="text-muted-foreground/80 mt-2">
              Timezone: {restaurant.location.timezone}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Contact</h3>
          <div className="space-y-2 text-sm">
            <div>📧 {restaurant.contact.email}</div>
            <div>📞 {restaurant.contact.phone}</div>
            {restaurant.contact.website && (
              <div>🌐 {restaurant.contact.website}</div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <div className="space-y-2 text-sm">
            <div>Seating Capacity: {restaurant.settings.seatingCapacity}</div>
            <div>
              Table Turnover: {restaurant.settings.avgTableTurnoverMinutes} min
            </div>
            <div>
              Reservation Buffer: {restaurant.settings.reservationBuffer} min
            </div>
            <div>
              Party Size: {restaurant.settings.minPartySize}-
              {restaurant.settings.maxPartySize}
            </div>
            <div>
              Advance Booking: {restaurant.settings.advanceBookingDays} days
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Operating Hours</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(restaurant.operatingHours).map(([day, hours]) => (
              <div key={day} className="flex justify-between">
                <span className="capitalize font-medium">{day}</span>
                <span className="text-muted-foreground/80">
                  {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
