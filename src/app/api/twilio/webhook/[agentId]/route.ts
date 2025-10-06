import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Twilio webhook that forwards calls to ElevenLabs agent
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('Incoming call:', { from, to, callSid, agentId });

    // Get agent details from database to get ElevenLabs agent ID
    // For now, we'll use a direct websocket connection approach

    const twiml = new VoiceResponse();

    // Connect to ElevenLabs via WebSocket
    const connect = twiml.connect();
    const stream = connect.stream({
      url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`,
    });

    // Pass ElevenLabs API key as parameter
    stream.parameter({
      name: 'xi-api-key',
      value: process.env.ELEVENLABS_API_KEY!,
    });

    // Log the call
    console.log('Connecting call to ElevenLabs agent:', agentId);

    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error handling Twilio webhook:', error);

    const twiml = new VoiceResponse();
    twiml.say(
      'We apologize, but we are unable to connect your call at this time. Please try again later.'
    );

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}
