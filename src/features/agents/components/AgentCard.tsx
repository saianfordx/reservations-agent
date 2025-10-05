'use client';

import { Button } from '@/shared/components/ui/button';
import { EditAgentDialog } from './EditAgentDialog';

interface Agent {
  _id: string;
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
  onUpdate?: () => void;
}

export function AgentCard({ agent, onUpdate }: AgentCardProps) {
  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(agent.phoneNumber);
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{agent.name}</h3>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Voice: {agent.voiceName}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            agent.status === 'active'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {agent.status}
        </span>
      </div>

      <div className="space-y-3">
        {/* Phone Number */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <div className="text-xs text-muted-foreground/80">Phone Number</div>
            <div className="font-mono text-sm font-medium mt-1">
              {agent.phoneNumber}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={copyPhoneNumber}>
            📋 Copy
          </Button>
        </div>

        {/* Greeting */}
        <div>
          <div className="text-xs text-muted-foreground/80">Greeting</div>
          <p className="text-sm mt-1 line-clamp-2">
            {agent.agentConfig.greeting}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div>
            <div className="text-xs text-muted-foreground/80">Total Calls</div>
            <div className="text-lg font-semibold">{agent.totalCalls}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground/80">Minutes</div>
            <div className="text-lg font-semibold">{agent.totalMinutes}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <EditAgentDialog agent={agent} onSuccess={onUpdate} />
        <Button variant="outline" size="sm" className="flex-1">
          View Calls
        </Button>
      </div>
    </div>
  );
}
