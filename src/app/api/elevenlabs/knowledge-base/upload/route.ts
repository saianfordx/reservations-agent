import { NextRequest, NextResponse } from 'next/server';

/**
 * Upload a file to ElevenLabs knowledge base
 * Returns the file ID from ElevenLabs
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to ElevenLabs knowledge base
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('file', file);
    if (name) {
      elevenLabsFormData.append('name', name);
    }

    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/knowledge-base/file',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: elevenLabsFormData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs upload error:', error);
      throw new Error(`Failed to upload to ElevenLabs: ${error}`);
    }

    const data = await response.json();

    return NextResponse.json({
      id: data.id,
      name: data.name || file.name,
      success: true,
    });
  } catch (error) {
    console.error('Error uploading to ElevenLabs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload' },
      { status: 500 }
    );
  }
}
