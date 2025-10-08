'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceSelector } from './VoiceSelector';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';

interface EditAgentDialogProps {
  agent: {
    _id: string;
    elevenLabsAgentId: string;
    elevenLabsVoiceId: string;
    name: string;
    voiceName: string;
    prompt?: string;
    restaurantId: string;
    organizationId?: string;
    agentConfig: {
      greeting: string;
    };
  };
  restaurantOrganizationId?: string;
  onSuccess?: () => void;
}

export function EditAgentDialog({ agent, restaurantOrganizationId, onSuccess }: EditAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [name, setName] = useState(agent.name);
  const [greeting, setGreeting] = useState(agent.agentConfig.greeting);
  const [prompt, setPrompt] = useState(agent.prompt || '');
  const [selectedVoiceId, setSelectedVoiceId] = useState(agent.elevenLabsVoiceId);
  const [selectedVoiceName, setSelectedVoiceName] = useState(agent.voiceName);
  const [selectedKnowledgeItems, setSelectedKnowledgeItems] = useState<Set<{ _id: string; elevenLabsFileId: string; name: string }>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAgentMutation = useMutation(api.agents.update);
  const addToAgentMutation = useMutation(api.knowledgeBase.addToAgent);
  const removeFromAgentMutation = useMutation(api.knowledgeBase.removeFromAgent);

  // Get current agent knowledge base items to determine what changed
  const currentAgentItems = useQuery(api.knowledgeBase.getByAgent, {
    agentId: agent._id as Id<'agents'>,
  });

  // Fetch the current prompt from ElevenLabs when dialog opens
  useEffect(() => {
    if (open && !prompt) {
      fetchCurrentPrompt();
    }
  }, [open]);

  const fetchCurrentPrompt = async () => {
    setIsFetchingPrompt(true);
    try {
      const response = await fetch(
        `/api/agents/${agent._id}/get-prompt?elevenLabsAgentId=${agent.elevenLabsAgentId}`,
        {
          method: 'GET',
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.prompt) {
          setPrompt(data.prompt);
        }
      }
    } catch (err) {
      console.error('Error fetching prompt:', err);
    } finally {
      setIsFetchingPrompt(false);
    }
  };

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
          prompt,
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
        prompt,
      });

      // Step 3: Update knowledge base mappings in Convex
      if (currentAgentItems) {
        const currentItemIds = currentAgentItems.map((item) => item._id as string);
        const selectedItemIds = Array.from(selectedKnowledgeItems).map((item) => item._id);

        // Determine what to add and remove
        const itemsToAdd = selectedItemIds.filter((id) => !currentItemIds.includes(id));
        const itemsToRemove = currentItemIds.filter((id) => !selectedItemIds.includes(id));

        // Update mappings in our database
        for (const itemId of itemsToAdd) {
          await addToAgentMutation({
            agentId: agent._id as Id<'agents'>,
            knowledgeBaseItemId: itemId as Id<'knowledgeBaseItems'>,
          });
        }

        for (const itemId of itemsToRemove) {
          await removeFromAgentMutation({
            agentId: agent._id as Id<'agents'>,
            knowledgeBaseItemId: itemId as Id<'knowledgeBaseItems'>,
          });
        }
      }

      // Step 4: Sync knowledge base to ElevenLabs
      const knowledgeBaseItemsArray = Array.from(selectedKnowledgeItems);
      console.log('Syncing knowledge base:', {
        selectedKnowledgeItems,
        knowledgeBaseItemsArray,
        size: selectedKnowledgeItems.size,
      });

      const syncResponse = await fetch(`/api/agents/${agent._id}/knowledge-base/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elevenLabsAgentId: agent.elevenLabsAgentId,
          knowledgeBaseItems: knowledgeBaseItemsArray,
        }),
      });

      if (!syncResponse.ok) {
        const data = await syncResponse.json();
        throw new Error(data.error || 'Failed to sync knowledge base');
      }

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
        setPrompt(agent.prompt || '');
        setSelectedVoiceId(agent.elevenLabsVoiceId);
        setSelectedVoiceName(agent.voiceName);
        setError(null);
        setActiveTab('basic');
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Configure your agent&apos;s settings, prompt, and knowledge base. Click &quot;Save Changes&quot; to apply all updates.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="basic" className="space-y-6 mt-0">
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
            </TabsContent>

            <TabsContent value="prompt" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="prompt">System Prompt</Label>
                {isFetchingPrompt ? (
                  <div className="flex items-center justify-center py-12 border rounded-md bg-muted/30">
                    <div className="text-sm text-muted-foreground">Loading current prompt...</div>
                  </div>
                ) : (
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    placeholder="Enter the system instructions for your agent. For example: You are a helpful restaurant assistant who can help customers make, modify, and cancel reservations..."
                    rows={15}
                    className="font-mono text-sm"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Define how your agent should behave and respond to customers. This is the core instruction set for your AI agent.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="mt-0">
              {(agent.organizationId || restaurantOrganizationId) ? (
                <KnowledgeBaseManager
                  agentId={agent._id as Id<'agents'>}
                  organizationId={(agent.organizationId || restaurantOrganizationId) as Id<'organizations'>}
                  onSelectedItemsChange={setSelectedKnowledgeItems}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3">📚</div>
                  <div className="text-sm font-medium text-black">Organization Required</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    This agent needs to be associated with an organization to manage knowledge base.
                  </div>
                </div>
              )}
            </TabsContent>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
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
