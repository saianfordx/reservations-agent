import { NextRequest, NextResponse } from 'next/server';
import { getAllReservationTools } from '@/lib/elevenlabs/tools';

/**
 * Update an ElevenLabs agent's webhook URLs with the correct agentId
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { restaurantId, convexAgentId, restaurantName, knowledge_base_documents } = await req.json();

    if (!restaurantId || !convexAgentId || !restaurantName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get updated tools with correct agentId
    const tools = getAllReservationTools(webhookBaseUrl, restaurantId, convexAgentId);

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

    // Build the prompt config with both tools and knowledge base (if provided)
    const promptConfig: Record<string, unknown> = {
      prompt: agentPrompt,
      tools: tools,
    };

    // Include knowledge base if documents were provided
    if (knowledge_base_documents && knowledge_base_documents.length > 0) {
      promptConfig.knowledge_base = knowledge_base_documents.map((doc: { id: string; name: string }) => ({
        type: 'file',
        id: doc.id,
        name: doc.name,
      }));
    }

    // Update agent with correct webhook URLs AND preserve knowledge base
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
              prompt: promptConfig,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to update agent webhooks:', error);
      throw new Error('Failed to update agent webhooks');
    }

    await response.json(); // Consume response

    return NextResponse.json({
      success: true,
      agent_id: agentId,
    });
  } catch (error) {
    console.error('Error updating agent webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to update agent webhooks' },
      { status: 500 }
    );
  }
}
