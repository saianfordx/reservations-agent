import { NextRequest, NextResponse } from 'next/server';

/**
 * Get the current system prompt from ElevenLabs agent
 * This endpoint takes the elevenLabsAgentId as a query parameter
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Await params for Next.js 15 compatibility

    // Get elevenLabsAgentId from query params
    const elevenLabsAgentId = req.nextUrl.searchParams.get('elevenLabsAgentId');

    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'elevenLabsAgentId is required' },
        { status: 400 }
      );
    }

    // Fetch current agent config from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch agent from ElevenLabs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent configuration' },
        { status: 500 }
      );
    }

    const elevenLabsAgent = await response.json();

    // Extract the prompt from the conversation config
    const prompt = elevenLabsAgent.conversation_config?.agent?.prompt?.prompt || '';

    return NextResponse.json({
      prompt,
      name: elevenLabsAgent.name,
      firstMessage: elevenLabsAgent.conversation_config?.agent?.first_message,
    });
  } catch (error) {
    console.error('Error fetching agent prompt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}
