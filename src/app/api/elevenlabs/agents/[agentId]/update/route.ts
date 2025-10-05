import { NextRequest, NextResponse } from 'next/server';

/**
 * Update an ElevenLabs agent to attach knowledge base documents
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { knowledge_base_documents } = await req.json();

    if (!knowledge_base_documents || knowledge_base_documents.length === 0) {
      return NextResponse.json(
        { error: 'No knowledge base documents provided' },
        { status: 400 }
      );
    }

    // Update agent to include knowledge base
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                knowledge_base: knowledge_base_documents.map((doc: { id: string; name: string }) => ({
                  type: 'file',
                  id: doc.id,
                  name: doc.name,
                })),
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to update agent:', error);
      throw new Error('Failed to attach knowledge base to agent');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      knowledge_base_count: knowledge_base_documents.length,
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}
