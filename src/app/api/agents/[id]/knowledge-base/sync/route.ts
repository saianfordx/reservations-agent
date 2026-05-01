import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Sync knowledge base items to ElevenLabs agent
 * This updates the agent's prompt.knowledge_base in ElevenLabs
 *
 * Expects knowledgeBaseItems array with { elevenLabsFileId, name } objects
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await params;
    const { elevenLabsAgentId, knowledgeBaseItems } = await req.json();

    if (!elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'elevenLabsAgentId is required' },
        { status: 400 }
      );
    }

    if (!knowledgeBaseItems || !Array.isArray(knowledgeBaseItems)) {
      return NextResponse.json(
        { error: 'knowledgeBaseItems array is required' },
        { status: 400 }
      );
    }

    // Fetch current agent config from ElevenLabs to preserve other settings
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

    // Build knowledge base array for ElevenLabs from the provided items
    const knowledgeBase = knowledgeBaseItems.map((item: { elevenLabsFileId: string; name: string }) => ({
      type: 'file',
      id: item.elevenLabsFileId,
      name: item.name,
    }));

    console.log('Syncing knowledge base to ElevenLabs:', {
      elevenLabsAgentId,
      knowledgeBaseCount: knowledgeBase.length,
      knowledgeBase,
    });

    // Get existing prompt config and strip out tools/tool_ids to avoid conflicts
    const existingPrompt = currentAgent.conversation_config?.agent?.prompt || {};
    const { tools: _tools, tool_ids: _toolIds, ...promptWithoutTools } = existingPrompt;

    // Update ElevenLabs agent with new knowledge base
    const updateResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
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
                ...promptWithoutTools,
                knowledge_base: knowledgeBase,
              },
              first_message: currentAgent.conversation_config?.agent?.first_message,
            },
            tts: currentAgent.conversation_config?.tts,
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('Failed to update ElevenLabs agent:', {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        error: error,
        knowledgeBase: knowledgeBase,
      });
      throw new Error(`Failed to sync knowledge base to ElevenLabs: ${updateResponse.status} - ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Knowledge base synced successfully',
      itemCount: knowledgeBaseItems.length,
    });
  } catch (error) {
    console.error('Error syncing knowledge base:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync knowledge base' },
      { status: 500 }
    );
  }
}
