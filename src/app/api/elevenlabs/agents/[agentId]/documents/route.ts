import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to ElevenLabs knowledge base
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('name', file.name);

    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/knowledge-base/file',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs document upload error:', error);
      throw new Error(`Failed to upload document: ${error}`);
    }

    const data = await response.json();

    return NextResponse.json({
      id: data.id,
      name: data.name || file.name,
      success: true,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
