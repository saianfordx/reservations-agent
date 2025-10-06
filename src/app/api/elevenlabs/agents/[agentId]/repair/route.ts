import { NextRequest, NextResponse } from 'next/server';
import { getAllReservationTools } from '@/lib/elevenlabs/tools';

/**
 * Repair endpoint to fix agents that may have lost their tools configuration
 * This fetches the current agent config, and re-applies the tools with correct webhook URLs
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId: elevenLabsAgentId } = await params;
    const { restaurantId, convexAgentId, restaurantName } = await req.json();

    if (!restaurantId || !convexAgentId || !restaurantName) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, convexAgentId, restaurantName' },
        { status: 400 }
      );
    }

    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get tools with correct webhook URLs
    const tools = getAllReservationTools(webhookBaseUrl, restaurantId, convexAgentId);

    // Fetch current agent configuration to preserve knowledge_base
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
      console.error('Failed to fetch agent:', error);
      throw new Error('Failed to fetch agent configuration');
    }

    const currentAgent = await getResponse.json();

    // Create the agent prompt
    const agentPrompt = `You are a professional restaurant reservation assistant for ${restaurantName}.

Your primary responsibilities are:
1. Create new reservations by collecting: customer name, date, time, and party size
2. Modify existing reservations when customers provide their reservation ID
3. Cancel reservations when requested
4. Answer questions about the restaurant using the knowledge base

Always be polite, professional, and efficient. Confirm all details before finalizing any reservation.

When creating a reservation, you must collect:
- Full name (required)
- Date (required)
- Time (required)
- Party size / number of guests (required)
- Phone number (optional but recommended)
- Any special requests (optional)

After collecting all information, use the create_reservation function to save the reservation.`;

    // Build the complete prompt config with both tools and knowledge_base
    const promptConfig: Record<string, unknown> = {
      prompt: agentPrompt,
      tools: tools,
    };

    // Preserve knowledge_base if it exists
    if (currentAgent.conversation_config?.agent?.prompt?.knowledge_base) {
      promptConfig.knowledge_base = currentAgent.conversation_config.agent.prompt.knowledge_base;
    }

    // Update agent with repaired configuration
    const response = await fetch(
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
              prompt: promptConfig,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to repair agent:', error);
      throw new Error('Failed to repair agent');
    }

    await response.json(); // Consume response

    return NextResponse.json({
      success: true,
      message: 'Agent repaired successfully. Tools have been restored with correct webhook URLs.',
      agent_id: elevenLabsAgentId,
    });
  } catch (error) {
    console.error('Error repairing agent:', error);
    return NextResponse.json(
      { error: 'Failed to repair agent' },
      { status: 500 }
    );
  }
}
