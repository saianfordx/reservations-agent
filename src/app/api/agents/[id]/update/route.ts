import { NextRequest, NextResponse } from 'next/server';
import {
  LanguageSettings,
  VoiceSettings,
  ConversationBehavior,
  FirstMessageSettings,
  AudioSettings,
} from '@/features/agents/types/agent-config.types';

interface UpdateAgentRequest {
  elevenLabsAgentId: string;
  name?: string;
  voiceId?: string;
  greeting?: string;
  prompt?: string;
  // Configuration fields
  languages?: LanguageSettings;
  voiceSettings?: VoiceSettings;
  // Note: llmSettings removed - ElevenLabs uses GPT-5.1 by default
  conversationBehavior?: ConversationBehavior;
  firstMessageSettings?: FirstMessageSettings;
  audioSettings?: AudioSettings;
}

/**
 * Update ElevenLabs agent settings (name, voice, greeting, and advanced config)
 * Only updates ElevenLabs - Convex updates happen on client side
 *
 * IMPORTANT: This endpoint fetches the current agent config from ElevenLabs first,
 * then merges updates to preserve tools and knowledge_base configuration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Await params for Next.js 15 compatibility
    const body: UpdateAgentRequest = await req.json();
    const {
      elevenLabsAgentId,
      name,
      voiceId,
      greeting,
      prompt,
      languages,
      voiceSettings,
      conversationBehavior,
      firstMessageSettings,
      audioSettings,
    } = body;

    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'ElevenLabs agent ID is required' },
        { status: 400 }
      );
    }

    // First, fetch the current agent configuration to preserve tools and knowledge_base
    const getResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!getResponse.ok) {
      const error = await getResponse.text();
      console.error('Failed to fetch current agent config:', error);
      throw new Error('Failed to fetch current agent configuration');
    }

    const currentAgent = await getResponse.json();

    // Build updated payload, preserving existing configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elevenLabsPayload: Record<string, any> = {};

    if (name !== undefined) {
      elevenLabsPayload.name = name;
    }

    // Initialize conversation_config
    const hasAgentUpdates = greeting !== undefined || prompt !== undefined ||
      languages !== undefined || firstMessageSettings !== undefined;
    const hasTtsUpdates = voiceId !== undefined || voiceSettings !== undefined;
    const hasTurnUpdates = conversationBehavior !== undefined;
    const hasAsrUpdates = audioSettings !== undefined;

    if (hasAgentUpdates || hasTtsUpdates || hasTurnUpdates || hasAsrUpdates) {
      elevenLabsPayload.conversation_config = {};

      // Agent config updates
      if (hasAgentUpdates) {
        elevenLabsPayload.conversation_config.agent = {};

        // First message / greeting
        if (greeting !== undefined) {
          elevenLabsPayload.conversation_config.agent.first_message = greeting;
        } else if (firstMessageSettings?.defaultMessage !== undefined) {
          elevenLabsPayload.conversation_config.agent.first_message = firstMessageSettings.defaultMessage;
        }

        // Language
        if (languages?.defaultLanguage !== undefined) {
          elevenLabsPayload.conversation_config.agent.language = languages.defaultLanguage;
        }

        // First message interruptibility
        if (firstMessageSettings?.interruptible !== undefined) {
          elevenLabsPayload.conversation_config.agent.disable_first_message_interruptions =
            !firstMessageSettings.interruptible;
        }

        // Prompt update (LLM settings removed - ElevenLabs uses GPT-5.1 by default)
        if (prompt !== undefined) {
          // Preserve existing prompt config (like knowledge_base) while updating
          const existingPrompt = currentAgent.conversation_config?.agent?.prompt || {};
          // Remove tools/tool_ids from prompt to avoid conflicts
          const { tools: _tools, tool_ids: _toolIds, ...promptWithoutTools } = existingPrompt;

          elevenLabsPayload.conversation_config.agent.prompt = {
            ...promptWithoutTools,
            prompt: prompt,
          };
        }
      }

      // TTS config updates
      if (hasTtsUpdates) {
        elevenLabsPayload.conversation_config.tts = {};

        if (voiceId !== undefined) {
          elevenLabsPayload.conversation_config.tts.voice_id = voiceId;
        } else if (voiceSettings?.primaryVoice?.voiceId !== undefined) {
          elevenLabsPayload.conversation_config.tts.voice_id = voiceSettings.primaryVoice.voiceId;
        }

        if (voiceSettings !== undefined) {
          if (voiceSettings.ttsModelId) {
            elevenLabsPayload.conversation_config.tts.model_id = voiceSettings.ttsModelId;
          }
          if (voiceSettings.primaryVoice) {
            elevenLabsPayload.conversation_config.tts.stability = voiceSettings.primaryVoice.stability;
            elevenLabsPayload.conversation_config.tts.speed = voiceSettings.primaryVoice.speed;
            elevenLabsPayload.conversation_config.tts.similarity_boost = voiceSettings.primaryVoice.similarityBoost;
          }

          // Language overrides for additional voices
          if (voiceSettings.additionalVoices && voiceSettings.additionalVoices.length > 0) {
            const languageOverrides: Record<string, { voice_id: string; stability: number; speed: number; similarity_boost: number }> = {};
            for (const voice of voiceSettings.additionalVoices) {
              languageOverrides[voice.language] = {
                voice_id: voice.voiceId,
                stability: voice.stability,
                speed: voice.speed,
                similarity_boost: voice.similarityBoost,
              };
            }
            elevenLabsPayload.conversation_config.tts.language_overrides = languageOverrides;
          }
        }
      }

      // Turn config updates
      if (hasTurnUpdates && conversationBehavior) {
        elevenLabsPayload.conversation_config.turn = {
          turn_timeout: conversationBehavior.turnTimeout,
          turn_eagerness: conversationBehavior.eagerness,
          silence_end_call_timeout: conversationBehavior.silenceEndCallTimeout,
        };

        if (conversationBehavior.softTimeout?.enabled) {
          elevenLabsPayload.conversation_config.turn.soft_timeout_config = {
            timeout_seconds: conversationBehavior.softTimeout.timeoutSeconds,
            message: conversationBehavior.softTimeout.message,
          };
        }

        // Max duration
        elevenLabsPayload.conversation_config.conversation = {
          max_duration_seconds: conversationBehavior.maxDuration,
        };
      }

      // ASR config updates
      if (hasAsrUpdates && audioSettings) {
        elevenLabsPayload.conversation_config.asr = {
          user_input_audio_format: audioSettings.userInputFormat,
        };
      }
    }

    // Only call ElevenLabs if there are updates
    if (Object.keys(elevenLabsPayload).length > 0) {
      console.log('Sending to ElevenLabs:', JSON.stringify(elevenLabsPayload, null, 2));

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
        {
          method: 'PATCH',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(elevenLabsPayload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('ElevenLabs API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: error,
          payload: elevenLabsPayload
        });
        throw new Error(`Failed to update agent in ElevenLabs: ${response.status} - ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully',
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update agent',
      },
      { status: 500 }
    );
  }
}
