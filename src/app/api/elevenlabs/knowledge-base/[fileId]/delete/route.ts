import { NextRequest, NextResponse } from 'next/server';

/**
 * Delete a file from ElevenLabs knowledge base
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/knowledge-base/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      // Ignore 404 - file already deleted
      const error = await response.text();
      console.error('Failed to delete from ElevenLabs:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted from ElevenLabs',
    });
  } catch (error) {
    console.error('Error deleting from ElevenLabs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 }
    );
  }
}
