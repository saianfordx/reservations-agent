import { NextRequest, NextResponse } from 'next/server';

/**
 * Initiate a test call from an ElevenLabs agent to a phone number
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { phoneNumberId, toNumber } = await req.json();

    if (!phoneNumberId || !toNumber) {
      return NextResponse.json(
        { error: 'Phone number ID and destination number are required' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic check)
    if (!toNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    // Initiate outbound call via ElevenLabs
    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: toNumber,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to initiate test call:', error);
      throw new Error('Failed to initiate test call');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      conversationId: data.conversation_id,
      callSid: data.callSid,
      message: `Test call initiated to ${toNumber}`,
    });
  } catch (error) {
    console.error('Error initiating test call:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to initiate test call',
      },
      { status: 500 }
    );
  }
}
