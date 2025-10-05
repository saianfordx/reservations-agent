'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VoiceSelector } from './VoiceSelector';

interface EditAgentDialogProps {
  agent: {
    _id: string;
    elevenLabsAgentId: string;
    elevenLabsVoiceId: string;
    name: string;
    voiceName: string;
    agentConfig: {
      greeting: string;
    };
  };
  onSuccess?: () => void;
}

export function EditAgentDialog({ agent, onSuccess }: EditAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(agent.name);
  const [greeting, setGreeting] = useState(agent.agentConfig.greeting);
  const [selectedVoiceId, setSelectedVoiceId] = useState(agent.elevenLabsVoiceId);
  const [selectedVoiceName, setSelectedVoiceName] = useState(agent.voiceName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAgentMutation = useMutation(api.agents.update);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Update ElevenLabs agent
      const elevenLabsResponse = await fetch(`/api/agents/${agent._id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elevenLabsAgentId: agent.elevenLabsAgentId,
          name,
          greeting,
          voiceId: selectedVoiceId,
        }),
      });

      if (!elevenLabsResponse.ok) {
        const data = await elevenLabsResponse.json();
        throw new Error(data.error || 'Failed to update agent in ElevenLabs');
      }

      // Step 2: Update Convex database (authenticated client-side call)
      await updateAgentMutation({
        agentId: agent._id as Id<'agents'>,
        name,
        greeting,
        voiceId: selectedVoiceId,
        voiceName: selectedVoiceName,
      });

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setName(agent.name);
        setGreeting(agent.agentConfig.greeting);
        setSelectedVoiceId(agent.elevenLabsVoiceId);
        setSelectedVoiceName(agent.voiceName);
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update your agent's name, voice, and greeting message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Bella's Bistro Assistant"
            />
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <Label>Voice</Label>
            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceSelect={(id, name) => {
                setSelectedVoiceId(id);
                setSelectedVoiceName(name);
              }}
            />
          </div>

          {/* Greeting */}
          <div className="space-y-2">
            <Label htmlFor="greeting">First Message / Greeting</Label>
            <Textarea
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Thank you for calling Bella's Bistro! How may I assist you today?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This is what the agent will say when answering a call.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || !greeting || !selectedVoiceId || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
