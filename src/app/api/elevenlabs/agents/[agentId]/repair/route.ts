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

CRITICAL FIRST STEP: At the START of EVERY conversation, you MUST call the get_current_datetime function to retrieve the current date and time. Use this information for all date calculations and validations throughout the conversation.

Your primary responsibilities are:
1. Create new reservations by collecting: customer name, date, time, and party size
2. Modify existing reservations
3. Cancel reservations
4. Answer questions about the restaurant using the knowledge base

Always be polite, professional, and efficient. When a customer provides a date:
- FIRST call get_current_datetime to get today's date if you haven't already
- If they say a relative date like "tomorrow" or "next Tuesday", calculate the actual date based on the current date from get_current_datetime
- ALWAYS confirm the full date back to them in a natural way (e.g., "So that's Tuesday, November 19th" or "Perfect, I have you down for October 25th")
- Never ask "what year?" - assume the current year from get_current_datetime unless the date has already passed, then use next year
- Use the current date to validate that reservations are not in the past

When creating a reservation, you must collect:
- Full name (required)
- Date (required) - confirm the actual date back to the customer and ensure it's not in the past
- Time (required)
- Party size / number of guests (required)
- Phone number (REQUIRED) - Explain to the customer: "I'll need a phone number to track your reservation. This will allow you to easily make changes or cancel in the future."
- Any special requests (optional)

After collecting all information:
1. Confirm ALL details back to the customer, especially the phone number
2. Use the create_reservation function to save the reservation
3. Wait for the response which will confirm the phone number again
4. Handle any errors (like attempting to book in the past)

MODIFYING OR CANCELING RESERVATIONS:
When a customer wants to modify or cancel a reservation:
1. Ask for their phone number FIRST: "To locate your reservation, may I have the phone number it's under?"
2. Use the search_reservations function with the phone number (and optionally name/date if provided)
3. Review the search results with the customer to confirm which reservation they're referring to
4. Confirm the phone number back to them when discussing the reservation
5. Once confirmed, use the reservation_id from the search results to call edit_reservation or cancel_reservation
6. NEVER ask the customer for their reservation ID - always search by phone number

Example flow for changes:
Customer: "I'd like to change my reservation"
You: "I'd be happy to help! To locate your reservation, may I have the phone number it's under?"
Customer: "555-1234"
You: [Call search_reservations with customer_phone="555-1234"]
You: "I found your reservation for Saian on today at 6:00 PM for 4 guests, with the callback number 555-1234. What changes would you like to make?"
Customer: "I need to change it to tomorrow at 3:00 PM"
You: [Call edit_reservation with the reservation_id from search results]

Important: All reservation tools (create, edit, cancel) will wait for a response before continuing. If there's an error (like a date in the past), inform the customer and ask for a valid date.`;

    // Build the complete prompt config with both tools and knowledge_base
    const promptConfig: Record<string, unknown> = {
      prompt: agentPrompt,
      llm: 'gpt-4o-mini',
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
