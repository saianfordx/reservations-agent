import { NextRequest, NextResponse } from 'next/server';

/**
 * Get all conversations for an ElevenLabs agent
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { searchParams } = new URL(req.url);

    // Get optional pagination parameters
    const pageSize = searchParams.get('page_size') || '100';
    const cursor = searchParams.get('cursor');

    // Build the ElevenLabs API URL
    const url = new URL('https://api.elevenlabs.io/v1/convai/conversations');
    url.searchParams.set('agent_id', agentId);
    url.searchParams.set('page_size', pageSize);
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    // Fetch conversations from ElevenLabs
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch conversations:', error);
      throw new Error('Failed to fetch conversations from ElevenLabs');
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
