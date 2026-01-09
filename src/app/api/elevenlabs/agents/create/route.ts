import { NextRequest, NextResponse } from 'next/server';
import { getAllTools } from '@/lib/elevenlabs/tools';
import { generateAgentPrompt, OperatingHours } from '@/lib/elevenlabs/agent-prompt';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import {
  LanguageSettings,
  VoiceSettings,
  ConversationBehavior,
  FirstMessageSettings,
  AudioSettings,
  DEFAULT_LANGUAGE_SETTINGS,
  DEFAULT_CONVERSATION_BEHAVIOR,
  DEFAULT_AUDIO_SETTINGS,
} from '@/features/agents/types/agent-config.types';

interface CreateAgentRequest {
  restaurantId: string;
  restaurantName: string;
  voiceId: string;
  greeting: string;
  agentName?: string;
  operatingHours?: OperatingHours;
  // Configuration fields
  languages?: LanguageSettings;
  voiceSettings?: VoiceSettings;
  // Note: llmSettings removed - ElevenLabs uses GPT-5.1 by default
  conversationBehavior?: ConversationBehavior;
  firstMessageSettings?: FirstMessageSettings;
  audioSettings?: AudioSettings;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateAgentRequest = await req.json();
    const {
      restaurantId,
      restaurantName,
      voiceId,
      greeting,
      agentName,
      operatingHours,
      languages = DEFAULT_LANGUAGE_SETTINGS,
      voiceSettings,
      conversationBehavior = DEFAULT_CONVERSATION_BEHAVIOR,
      firstMessageSettings,
      audioSettings = DEFAULT_AUDIO_SETTINGS,
    } = body;

    if (!restaurantId || !restaurantName || !voiceId || !greeting) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const convex = getConvexClient();

    // Fetch restaurant to get operating hours if not provided
    let effectiveOperatingHours = operatingHours;
    if (!effectiveOperatingHours) {
      const restaurant = await convex.query(api.restaurants.getRestaurantPublic, {
        id: restaurantId as Id<'restaurants'>,
      });
      if (restaurant?.operatingHours) {
        effectiveOperatingHours = restaurant.operatingHours as OperatingHours;
      }
    }

    // Use agent name or default to "Assistant"
    const effectiveAgentName = agentName || 'Assistant';

    // Create the agent prompt using the helper function (with agent name and hours)
    const agentPrompt = generateAgentPrompt(restaurantName, effectiveAgentName, effectiveOperatingHours);

    // Get ALL tools (both reservations and orders)
    // Note: We use 'pending' as agentId placeholder - will be updated after Convex save
    const tools = getAllTools(webhookBaseUrl, restaurantId, 'pending');

    // Build system tools configuration (hardcoded as per plan)
    const systemTools = [
      { type: 'system', name: 'end_call', description: 'End the conversation' },
      { type: 'system', name: 'language_detection', description: 'Detect user language and switch voice' },
    ];

    // Build language overrides for additional voices
    const languageOverrides: Record<string, { voice_id: string; stability?: number; speed?: number; similarity_boost?: number }> = {};
    if (voiceSettings?.additionalVoices) {
      for (const voice of voiceSettings.additionalVoices) {
        languageOverrides[voice.language] = {
          voice_id: voice.voiceId,
          stability: voice.stability,
          speed: voice.speed,
          similarity_boost: voice.similarityBoost,
        };
      }
    }

    // Create agent via ElevenLabs Conversational AI API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      name: agentName || `${restaurantName} Assistant`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: agentPrompt,
            // LLM settings removed - let ElevenLabs use default (GPT-5.1)
            tools: [...tools, ...systemTools],
          },
          first_message: firstMessageSettings?.defaultMessage || greeting,
          language: languages.defaultLanguage,
          ...(firstMessageSettings && {
            disable_first_message_interruptions: !firstMessageSettings.interruptible,
          }),
        },
        tts: {
          voice_id: voiceSettings?.primaryVoice?.voiceId || voiceId,
          model_id: voiceSettings?.ttsModelId || 'eleven_flash_v2_5', // v2.5 required for non-English
          ...(voiceSettings?.primaryVoice && {
            stability: voiceSettings.primaryVoice.stability,
            speed: voiceSettings.primaryVoice.speed,
            similarity_boost: voiceSettings.primaryVoice.similarityBoost,
          }),
          ...(Object.keys(languageOverrides).length > 0 && {
            language_overrides: languageOverrides,
          }),
        },
        turn: {
          turn_timeout: conversationBehavior.turnTimeout,
          turn_eagerness: conversationBehavior.eagerness,
          silence_end_call_timeout: conversationBehavior.silenceEndCallTimeout,
          ...(conversationBehavior.softTimeout?.enabled && {
            soft_timeout_config: {
              timeout_seconds: conversationBehavior.softTimeout.timeoutSeconds,
              message: conversationBehavior.softTimeout.message,
            },
          }),
        },
        conversation: {
          max_duration_seconds: conversationBehavior.maxDuration,
        },
        asr: {
          user_input_audio_format: audioSettings.userInputFormat,
          quality: 'high',
        },
      },
    };

    console.log('Creating agent with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      throw new Error(`Failed to create agent (${response.status}): ${error}`);
    }

    const data = await response.json();

    return NextResponse.json({
      agentId: data.agent_id,
      success: true,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
