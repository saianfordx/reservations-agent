import { NextRequest, NextResponse } from 'next/server';

/**
 * Get audio recording for a specific conversation
 * This proxies the audio file from ElevenLabs
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    console.log('Fetching audio for conversation:', conversationId);

    // Fetch audio from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    console.log('ElevenLabs audio response status:', response.status);
    console.log('ElevenLabs audio response content-type:', response.headers.get('content-type'));

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch conversation audio:', conversationId, error);
      throw new Error('Failed to fetch conversation audio from ElevenLabs');
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    console.log('Audio buffer size:', audioBuffer.byteLength);

    // Get the actual content type from ElevenLabs response
    const contentType = response.headers.get('content-type') || 'audio/mpeg';

    // Return the audio file with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="conversation-${conversationId}.mp3"`,
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching conversation audio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation audio' },
      { status: 500 }
    );
  }
}
