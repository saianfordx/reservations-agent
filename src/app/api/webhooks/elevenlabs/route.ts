import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('ElevenLabs webhook received:', body);

    // Handle different event types
    if (body.event_type === 'voice_removal_notice') {
      // Handle voice removal notice
      console.log('Voice removal notice:', body);
    } else if (body.event_type === 'transcription_completed') {
      // Handle transcription completed
      console.log('Transcription completed:', body);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing ElevenLabs webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
