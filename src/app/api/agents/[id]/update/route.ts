import { NextRequest, NextResponse } from 'next/server';

/**
 * Update ElevenLabs agent settings (name, voice, greeting)
 * Only updates ElevenLabs - Convex updates happen on client side
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Await params for Next.js 15 compatibility
    const { elevenLabsAgentId, name, voiceId, greeting } = await req.json();

    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'ElevenLabs agent ID is required' },
        { status: 400 }
      );
    }

    // Update ElevenLabs agent (only safe fields)
    const elevenLabsPayload: any = {};

    if (name !== undefined) {
      elevenLabsPayload.name = name;
    }

    if (voiceId !== undefined || greeting !== undefined) {
      elevenLabsPayload.conversation_config = {
        agent: {},
        tts: {},
      };

      if (greeting !== undefined) {
        elevenLabsPayload.conversation_config.agent.first_message = greeting;
      }

      if (voiceId !== undefined) {
        elevenLabsPayload.conversation_config.tts.voice_id = voiceId;
      }
    }

    // Only call ElevenLabs if there are updates
    if (Object.keys(elevenLabsPayload).length > 0) {
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
        console.error('Failed to update ElevenLabs agent:', error);
        throw new Error('Failed to update agent in ElevenLabs');
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
