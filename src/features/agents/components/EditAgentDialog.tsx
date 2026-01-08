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
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VoiceSelector } from './VoiceSelector';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { ConversationSettings } from './ConversationSettings';
import { LanguageSettings } from './LanguageSettings';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import {
  LanguageSettings as LanguageSettingsType,
  VoiceSettings as VoiceSettingsType,
  ConversationBehavior,
  FirstMessageSettings,
  AudioSettings,
  UserInputAudioFormat,
  DEFAULT_LANGUAGE_SETTINGS,
  DEFAULT_CONVERSATION_BEHAVIOR,
  DEFAULT_FIRST_MESSAGE_SETTINGS,
  DEFAULT_AUDIO_SETTINGS,
} from '../types/agent-config.types';
import { USER_INPUT_AUDIO_FORMATS } from '../constants/languages';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    // Config fields
    languages?: LanguageSettingsType;
    voiceSettings?: VoiceSettingsType;
    // Note: llmSettings removed - ElevenLabs uses GPT-5.1 by default
    conversationBehavior?: ConversationBehavior;
    firstMessageSettings?: FirstMessageSettings;
    audioSettings?: AudioSettings;
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

  // New configuration state
  const [languages, setLanguages] = useState<LanguageSettingsType>(
    agent.languages || DEFAULT_LANGUAGE_SETTINGS
  );
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsType | undefined>(
    agent.voiceSettings
  );
  // Note: llmSettings state removed - ElevenLabs uses GPT-5.1 by default
  const [conversationBehavior, setConversationBehavior] = useState<ConversationBehavior>(
    agent.conversationBehavior || DEFAULT_CONVERSATION_BEHAVIOR
  );
  const [firstMessageSettings, setFirstMessageSettings] = useState<FirstMessageSettings>(
    agent.firstMessageSettings || { ...DEFAULT_FIRST_MESSAGE_SETTINGS, defaultMessage: agent.agentConfig.greeting }
  );
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(
    agent.audioSettings || DEFAULT_AUDIO_SETTINGS
  );

  // Collapsible sections state
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);
  const [showConversationBehavior, setShowConversationBehavior] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);

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
      // Step 1: Update ElevenLabs agent with all configuration
      const elevenLabsResponse = await fetch(`/api/agents/${agent._id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elevenLabsAgentId: agent.elevenLabsAgentId,
          name,
          greeting: firstMessageSettings.defaultMessage || greeting,
          voiceId: voiceSettings?.primaryVoice?.voiceId || selectedVoiceId,
          prompt,
          // Configuration fields (llmSettings removed - ElevenLabs uses GPT-5.1)
          languages,
          voiceSettings,
          conversationBehavior,
          firstMessageSettings,
          audioSettings,
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
        greeting: firstMessageSettings.defaultMessage || greeting,
        voiceId: voiceSettings?.primaryVoice?.voiceId || selectedVoiceId,
        voiceName: voiceSettings?.primaryVoice?.voiceName || selectedVoiceName,
        prompt,
        // Configuration fields (llmSettings removed - ElevenLabs uses GPT-5.1)
        languages,
        voiceSettings,
        conversationBehavior,
        firstMessageSettings,
        audioSettings,
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
        // Reset configuration state (llmSettings removed - ElevenLabs uses GPT-5.1)
        setLanguages(agent.languages || DEFAULT_LANGUAGE_SETTINGS);
        setVoiceSettings(agent.voiceSettings);
        setConversationBehavior(agent.conversationBehavior || DEFAULT_CONVERSATION_BEHAVIOR);
        setFirstMessageSettings(agent.firstMessageSettings || { ...DEFAULT_FIRST_MESSAGE_SETTINGS, defaultMessage: agent.agentConfig.greeting });
        setAudioSettings(agent.audioSettings || DEFAULT_AUDIO_SETTINGS);
        setShowAdvancedVoice(false);
        setShowConversationBehavior(false);
        setShowAudioSettings(false);
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

              {/* Language Settings */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Languages</Label>
                <LanguageSettings
                  settings={languages}
                  onChange={setLanguages}
                  disabled={isLoading}
                />
              </div>

              {/* First Message / Greeting */}
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-base font-medium">First Message</Label>
                <div className="space-y-2">
                  <Textarea
                    id="greeting"
                    value={firstMessageSettings.defaultMessage}
                    onChange={(e) => setFirstMessageSettings({
                      ...firstMessageSettings,
                      defaultMessage: e.target.value,
                    })}
                    disabled={isLoading}
                    placeholder="e.g., Thank you for calling! How may I assist you today?"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is what the agent will say when answering a call.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="interruptible">Interruptible</Label>
                    <p className="text-xs text-muted-foreground">Allow caller to interrupt the greeting</p>
                  </div>
                  <Switch
                    id="interruptible"
                    checked={firstMessageSettings.interruptible}
                    onCheckedChange={(checked) => setFirstMessageSettings({
                      ...firstMessageSettings,
                      interruptible: checked,
                    })}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="translateToAll">Translate to All</Label>
                    <p className="text-xs text-muted-foreground">Auto-translate greeting to additional languages</p>
                  </div>
                  <Switch
                    id="translateToAll"
                    checked={firstMessageSettings.translateToAll}
                    onCheckedChange={(checked) => setFirstMessageSettings({
                      ...firstMessageSettings,
                      translateToAll: checked,
                    })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Voice Selection - Simple */}
              <div className="space-y-2">
                <Label>Primary Voice</Label>
                <VoiceSelector
                  selectedVoiceId={voiceSettings?.primaryVoice?.voiceId || selectedVoiceId}
                  onVoiceSelect={(id, voiceName) => {
                    setSelectedVoiceId(id);
                    setSelectedVoiceName(voiceName);
                    setVoiceSettings({
                      ...voiceSettings,
                      primaryVoice: {
                        ...(voiceSettings?.primaryVoice || {
                          language: languages.defaultLanguage,
                          stability: 0.5,
                          speed: 1.0,
                          similarityBoost: 0.8,
                        }),
                        voiceId: id,
                        voiceName,
                      },
                      additionalVoices: voiceSettings?.additionalVoices || [],
                      ttsModelId: voiceSettings?.ttsModelId || 'eleven_flash_v2_5',
                    });
                  }}
                />
              </div>

              {/* Advanced Voice Settings - Collapsible */}
              <Collapsible open={showAdvancedVoice} onOpenChange={setShowAdvancedVoice}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Advanced Voice Settings</span>
                    {showAdvancedVoice ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <VoiceSettingsPanel
                    settings={voiceSettings}
                    onChange={setVoiceSettings}
                    disabled={isLoading}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Conversation Behavior - Collapsible */}
              <Collapsible open={showConversationBehavior} onOpenChange={setShowConversationBehavior}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Conversation Behavior</span>
                    {showConversationBehavior ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <ConversationSettings
                    settings={conversationBehavior}
                    onChange={setConversationBehavior}
                    disabled={isLoading}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Audio Settings - Collapsible */}
              <Collapsible open={showAudioSettings} onOpenChange={setShowAudioSettings}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Audio Settings</span>
                    {showAudioSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>User Input Audio Format</Label>
                      <Select
                        value={audioSettings.userInputFormat}
                        onValueChange={(value) => setAudioSettings({
                          ...audioSettings,
                          userInputFormat: value as UserInputAudioFormat,
                        })}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select audio format" />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_INPUT_AUDIO_FORMATS.map((format) => (
                            <SelectItem key={format.id} value={format.id}>
                              <div className="flex flex-col">
                                <span>{format.name}</span>
                                <span className="text-xs text-muted-foreground">{format.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Audio format for speech recognition. Use &apos;Telephony&apos; for phone calls.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-6 mt-0">
              {/* System Prompt - LLM settings removed, ElevenLabs uses GPT-5.1 by default */}
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
                    rows={12}
                    className="font-mono text-sm"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Define how your agent should behave and respond to customers. This is the core instruction set for your AI agent.
                  Restaurant hours are automatically included when synced from restaurant settings.
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
            disabled={!name || !firstMessageSettings.defaultMessage || !(voiceSettings?.primaryVoice?.voiceId || selectedVoiceId) || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
