import { NextRequest, NextResponse } from 'next/server';
import { getAllReservationTools } from '@/lib/elevenlabs/tools';

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, restaurantName, voiceId, greeting, agentName } =
      await req.json();

    if (!restaurantId || !restaurantName || !voiceId || !greeting) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create the agent prompt
    const agentPrompt = `You are a professional restaurant reservation assistant for ${restaurantName}.

CRITICAL FIRST STEP: At the START of EVERY conversation, you MUST call the get_current_datetime function to retrieve the current date and time. Use this information for all date calculations and validations throughout the conversation.

Your primary responsibilities are:
1. Create new reservations by collecting: customer name, date, time, and party size
2. Modify existing reservations when customers provide their reservation ID
3. Cancel reservations when requested
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
- Phone number (optional but recommended)
- Any special requests (optional)

After collecting all information and confirming the date, use the create_reservation function to save the reservation. Wait for the response to confirm success or handle any errors (like attempting to book in the past).

Important: All reservation tools (create, edit, cancel) will wait for a response before continuing. If there's an error (like a date in the past), inform the customer and ask for a valid date.`;

    // Get reservation management tools
    // Note: We use 'pending' as agentId placeholder - will be updated after Convex save
    const tools = getAllReservationTools(webhookBaseUrl, restaurantId, 'pending');

    // Create agent via ElevenLabs Conversational AI API
    const payload = {
      name: agentName || `${restaurantName} Assistant`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: agentPrompt,
            llm: 'gpt-4o-mini',
            tools: tools,
          },
          first_message: greeting,
          language: 'en',
        },
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_turbo_v2',
        },
      },
    };

    console.log('Creating agent with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      throw new Error(`Failed to create agent (${response.status}): ${error}`);
    }

    const data = await response.json();

    return NextResponse.json({
      agentId: data.agent_id,
      success: true,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
