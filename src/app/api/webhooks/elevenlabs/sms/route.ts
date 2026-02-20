import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';

/**
 * Webhook endpoint for ElevenLabs agent to send SMS messages via Twilio
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message } = body;

    // Get restaurant and agent IDs from query params
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const agentId = searchParams.get('agentId');

    if (!restaurantId || !agentId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request - missing restaurant or agent information.',
        },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!phone || !message) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required information. Please provide a phone number and message.',
        },
        { status: 400 }
      );
    }

    // Get the agent to use its phone number as the "from" number
    const convex = getConvexClient();
    const agent = await convex.query(api.agents.getAgentServerSide, {
      id: agentId as Id<'agents'>,
    });

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          message: 'Agent not found.',
        },
        { status: 404 }
      );
    }

    // Send SMS via Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const smsResult = await client.messages.create({
      to: phone,
      from: agent.phoneNumber,
      body: message,
    });

    console.log(`SMS sent successfully: ${smsResult.sid} to ${phone}`);

    return NextResponse.json({
      success: true,
      message: `Text message sent successfully to ${phone}.`,
      sms_sid: smsResult.sid,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);

    const twilioError = error as { code?: number; message?: string };

    // Handle common Twilio errors
    if (twilioError.code === 21211) {
      return NextResponse.json(
        {
          success: false,
          message: 'The phone number provided is not valid. Please ask the customer for a correct phone number.',
        },
        { status: 400 }
      );
    }

    if (twilioError.code === 21608) {
      return NextResponse.json(
        {
          success: false,
          message: 'The phone number is not able to send SMS. Please try a different approach.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Sorry, I was unable to send the text message right now. Please try again.',
      },
      { status: 500 }
    );
  }
}
