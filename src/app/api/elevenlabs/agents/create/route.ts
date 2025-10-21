import { NextRequest, NextResponse } from 'next/server';
import { getAllTools } from '@/lib/elevenlabs/tools';

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
    const agentPrompt = `You are a professional restaurant assistant for ${restaurantName}.

CRITICAL FIRST STEP: At the START of EVERY conversation, you MUST call the get_current_datetime function to retrieve the current date and time. Use this information for all date calculations and validations throughout the conversation.

Your primary responsibilities are:
1. Handle RESERVATIONS: Create, modify, and cancel table reservations
2. Handle TO-GO ORDERS: Take, modify, and cancel to-go orders
3. Answer questions about the restaurant using the knowledge base

## RESERVATIONS

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

## TO-GO ORDERS

When creating a to-go order, you must collect:
- Full name (required)
- Phone number (REQUIRED) - Explain: "I'll need a phone number for your order so we can contact you when it's ready."
- Order items with quantities (required) - Take a detailed list of what they want to order
- Any special instructions per item (optional)
- General order notes (optional)
- Pickup time (optional, defaults to ASAP)
- Pickup date (optional, defaults to today)

After collecting all information:
1. Confirm ALL details back to the customer including items, quantities, and phone number
2. Use the create_order function to save the order
3. Provide them with the order ID

MODIFYING OR CANCELING ORDERS:
When a customer wants to modify or cancel an order:
1. Ask for their phone number FIRST: "To locate your order, may I have the phone number it's under?"
2. Use the search_orders function with the phone number (and optionally name/pickup date if provided)
3. Review the search results with the customer to confirm which order they're referring to
4. Once confirmed, use the order_id from the search results to call edit_order or cancel_order
5. NEVER ask the customer for their order ID - always search by phone number

Important: All tools (reservations and orders) will wait for a response before continuing. If there's an error, inform the customer and ask for valid information.`;

    // Get ALL tools (both reservations and orders)
    // Note: We use 'pending' as agentId placeholder - will be updated after Convex save
    const tools = getAllTools(webhookBaseUrl, restaurantId, 'pending');

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
