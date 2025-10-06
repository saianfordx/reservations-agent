'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { EditAgentDialog } from './EditAgentDialog';

interface Agent {
  _id: string;
  restaurantId: string;
  elevenLabsAgentId: string;
  elevenLabsVoiceId: string;
  name: string;
  voiceName: string;
  phoneNumber: string;
  status: string;
  totalCalls: number;
  totalMinutes: number;
  agentConfig: {
    greeting: string;
  };
}

interface AgentCardProps {
  agent: Agent;
  restaurantName: string;
  restaurantTimezone: string;
  onUpdate?: () => void;
}

export function AgentCard({ agent, restaurantName, restaurantTimezone, onUpdate }: AgentCardProps) {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSuccess, setRepairSuccess] = useState(false);

  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(agent.phoneNumber);
  };

  const repairAgent = async () => {
    setIsRepairing(true);
    setRepairSuccess(false);

    try {
      const response = await fetch(`/api/elevenlabs/agents/${agent.elevenLabsAgentId}/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: agent.restaurantId,
          convexAgentId: agent._id,
          restaurantName: restaurantName,
          restaurantTimezone: restaurantTimezone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to repair agent');
      }

      setRepairSuccess(true);
      onUpdate?.();

      // Reset success message after 3 seconds
      setTimeout(() => setRepairSuccess(false), 3000);
    } catch (error) {
      console.error('Error repairing agent:', error);
      alert('Failed to repair agent. Please try again.');
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="rounded-xl bg-card p-6 transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-black">{agent.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Voice: {agent.voiceName}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
            agent.status === 'active'
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {agent.status}
        </span>
      </div>

      <div className="space-y-3">
        {/* Phone Number */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <div className="text-xs text-muted-foreground">Phone Number</div>
            <div className="font-mono text-sm font-medium mt-1 text-black">
              {agent.phoneNumber}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={copyPhoneNumber}>
            📋 Copy
          </Button>
        </div>

        {/* Greeting */}
        <div>
          <div className="text-xs text-muted-foreground">Greeting</div>
          <p className="text-sm mt-1 line-clamp-2 text-black">
            {agent.agentConfig.greeting}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <div>
            <div className="text-xs text-muted-foreground">Total Calls</div>
            <div className="text-lg font-semibold text-black">{agent.totalCalls}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Minutes</div>
            <div className="text-lg font-semibold text-black">{agent.totalMinutes}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <EditAgentDialog agent={agent} onSuccess={onUpdate} />
          <Button variant="outline" size="sm" className="flex-1">
            View Calls
          </Button>
        </div>

        <Button
          variant={repairSuccess ? "default" : "outline"}
          size="sm"
          onClick={repairAgent}
          disabled={isRepairing || repairSuccess}
          className="w-full"
        >
          {isRepairing ? 'Repairing...' : repairSuccess ? '✓ Repaired!' : '🔧 Repair Reservations'}
        </Button>
      </div>
    </div>
  );
}
