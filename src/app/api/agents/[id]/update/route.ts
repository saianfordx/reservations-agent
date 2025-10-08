import { NextRequest, NextResponse } from 'next/server';

/**
 * Update ElevenLabs agent settings (name, voice, greeting)
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
    const { elevenLabsAgentId, name, voiceId, greeting, prompt } = await req.json();

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
    const elevenLabsPayload: {
      name?: string;
      conversation_config?: {
        agent?: {
          first_message?: string;
          prompt?: Record<string, unknown>;
        };
        tts?: { voice_id?: string };
      };
    } = {};

    if (name !== undefined) {
      elevenLabsPayload.name = name;
    }

    // Build conversation_config, only including what we're actually updating
    if (voiceId !== undefined || greeting !== undefined || prompt !== undefined) {
      elevenLabsPayload.conversation_config = {};

      // Only add agent config if we're updating greeting or prompt
      if (greeting !== undefined || prompt !== undefined) {
        elevenLabsPayload.conversation_config.agent = {};

        if (greeting !== undefined) {
          elevenLabsPayload.conversation_config.agent.first_message = greeting;
        }

        if (prompt !== undefined) {
          // Preserve existing prompt config (like knowledge_base) while updating prompt text
          const existingPrompt = currentAgent.conversation_config?.agent?.prompt || {};
          // Remove tools/tool_ids from prompt to avoid conflicts
          const { tools, tool_ids, ...promptWithoutTools } = existingPrompt;

          elevenLabsPayload.conversation_config.agent.prompt = {
            ...promptWithoutTools,
            prompt: prompt,
          };
        }
      }

      // Only add tts config if we're updating voice
      if (voiceId !== undefined) {
        elevenLabsPayload.conversation_config.tts = {
          voice_id: voiceId,
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
