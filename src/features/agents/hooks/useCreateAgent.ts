'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import {
  LanguageSettings,
  VoiceSettings,
  ConversationBehavior,
  FirstMessageSettings,
  AudioSettings,
  DEFAULT_LANGUAGE_SETTINGS,
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_CONVERSATION_BEHAVIOR,
  DEFAULT_FIRST_MESSAGE_SETTINGS,
  DEFAULT_AUDIO_SETTINGS,
} from '../types/agent-config.types';

interface CreateAgentParams {
  restaurantId: Id<'restaurants'>;
  restaurantName: string;
  restaurantTimezone: string;
  agentName: string;
  voiceId: string;
  voiceName: string;
  greeting: string;
  documents: File[];
  // Configuration options (llmSettings removed - ElevenLabs uses GPT-5.1 by default)
  languages?: LanguageSettings;
  voiceSettings?: VoiceSettings;
  conversationBehavior?: ConversationBehavior;
  firstMessageSettings?: FirstMessageSettings;
  audioSettings?: AudioSettings;
}

export function useCreateAgent() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createAgentMutation = useMutation(api.agents.create);
  const updateDocumentsMutation = useMutation(api.agents.updateDocuments);

  const createAgent = async (params: CreateAgentParams) => {
    setIsCreating(true);
    setError(null);

    // Merge with defaults
    const languages = { ...DEFAULT_LANGUAGE_SETTINGS, ...params.languages };
    const voiceSettings: VoiceSettings = {
      ...DEFAULT_VOICE_SETTINGS,
      ...params.voiceSettings,
      primaryVoice: {
        ...DEFAULT_VOICE_SETTINGS.primaryVoice,
        voiceId: params.voiceId,
        voiceName: params.voiceName,
        ...params.voiceSettings?.primaryVoice,
      },
    };
    // Note: llmSettings removed - ElevenLabs uses GPT-5.1 by default
    const conversationBehavior = { ...DEFAULT_CONVERSATION_BEHAVIOR, ...params.conversationBehavior };
    const firstMessageSettings: FirstMessageSettings = {
      ...DEFAULT_FIRST_MESSAGE_SETTINGS,
      defaultMessage: params.greeting,
      ...params.firstMessageSettings,
    };
    const audioSettings = { ...DEFAULT_AUDIO_SETTINGS, ...params.audioSettings };

    try {
      // Step 1: Create agent in ElevenLabs
      const agentResponse = await fetch('/api/elevenlabs/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: params.restaurantId,
          restaurantName: params.restaurantName,
          restaurantTimezone: params.restaurantTimezone,
          agentName: params.agentName,
          voiceId: params.voiceId,
          greeting: params.greeting,
          // Configuration options (llmSettings removed - ElevenLabs uses GPT-5.1)
          languages,
          voiceSettings,
          conversationBehavior,
          firstMessageSettings,
          audioSettings,
        }),
      });

      if (!agentResponse.ok) {
        throw new Error('Failed to create agent in ElevenLabs');
      }

      const { agentId: elevenLabsAgentId } = await agentResponse.json();

      // Step 2: Provision phone number via Twilio (optional - may fail if not configured)
      let phoneNumber = 'Not configured';
      let elevenLabsPhoneNumberId: string | undefined;

      try {
        const phoneResponse = await fetch('/api/twilio/provision-number', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: elevenLabsAgentId,
            areaCode: '415' // Default to San Francisco, can be made configurable
          }),
        });

        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json();
          phoneNumber = phoneData.phoneNumber;
          elevenLabsPhoneNumberId = phoneData.elevenLabsPhoneNumberId;
          console.log('Phone number provisioned:', phoneNumber);
        } else {
          const error = await phoneResponse.json();
          console.warn('Phone provisioning failed:', error);
        }
      } catch (err) {
        console.warn('Phone provisioning error:', err);
        // Continue without phone number - can be added later via dashboard
      }

      // Step 3: Upload documents to knowledge base and attach to agent
      const uploadedDocs = [];
      const knowledgeBaseIds = [];

      for (const file of params.documents) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);

        const docResponse = await fetch(
          `/api/elevenlabs/agents/${elevenLabsAgentId}/documents`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (docResponse.ok) {
          const docData = await docResponse.json();
          uploadedDocs.push({
            id: docData.id,
            name: docData.name,
            type: getDocumentType(file.name),
            uploadedAt: Date.now(),
            size: file.size,
          });
          knowledgeBaseIds.push(docData.id);
        }
      }

      // Step 4: Save to Convex database
      const agentId = await createAgentMutation({
        restaurantId: params.restaurantId,
        elevenLabsAgentId,
        elevenLabsVoiceId: params.voiceId,
        elevenLabsPhoneNumberId,
        voiceName: params.voiceName,
        name: params.agentName,
        greeting: params.greeting,
        phoneNumber,
        // Configuration options (llmSettings removed - ElevenLabs uses GPT-5.1)
        languages,
        voiceSettings,
        conversationBehavior,
        firstMessageSettings,
        audioSettings,
      });

      // Step 5: Update agent webhooks with correct Convex agentId and include knowledge base
      await fetch(`/api/elevenlabs/agents/${elevenLabsAgentId}/update-webhooks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: params.restaurantId,
          convexAgentId: agentId,
          restaurantName: params.restaurantName,
          restaurantTimezone: params.restaurantTimezone,
          knowledge_base_documents: uploadedDocs.length > 0
            ? uploadedDocs.map(doc => ({ id: doc.id, name: doc.name }))
            : undefined,
        }),
      });

      // Step 6: Update documents if any were uploaded
      if (uploadedDocs.length > 0) {
        await updateDocumentsMutation({
          agentId,
          documents: uploadedDocs,
        });
      }

      return { agentId, phoneNumber, success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return { createAgent, isCreating, error };
}

function getDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('menu')) return 'menu';
  if (lower.includes('policy') || lower.includes('policies')) return 'policies';
  if (lower.includes('faq')) return 'faq';
  return 'general';
}
