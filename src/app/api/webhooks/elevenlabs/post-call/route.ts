import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../convex/_generated/api';
import crypto from 'crypto';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Verify ElevenLabs webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * ElevenLabs post-call webhook handler
 * Receives call transcripts and triggers AI analysis + email notifications
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('elevenlabs-signature');

    // 2. Verify webhook signature (if secret is configured)
    if (process.env.ELEVENLABS_WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(
        rawBody,
        signature,
        process.env.ELEVENLABS_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // 3. Parse webhook payload
    const payload = JSON.parse(rawBody);

    console.log('Received post-call webhook:', {
      conversation_id: payload.conversation_id,
      agent_id: payload.agent_id,
      has_transcript: !!payload.transcript,
    });

    // Validate required fields
    if (!payload.conversation_id || !payload.agent_id || !payload.transcript) {
      console.error('Missing required fields in webhook payload');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 4. Look up agent to get restaurant using Convex
    const agent = await convexClient.query(api.agents.getByElevenLabsAgentId, {
      elevenLabsAgentId: payload.agent_id,
    });

    if (!agent) {
      console.error('Agent not found for ElevenLabs agent_id:', payload.agent_id);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    console.log('Found agent:', {
      agentId: agent._id,
      restaurantId: agent.restaurantId,
      agentName: agent.name,
    });

    // 5. Get admin emails for the restaurant
    const adminEmails = await convexClient.query(api.notifications.getAdminEmails, {
      restaurantId: agent.restaurantId,
    });

    console.log(`Found ${adminEmails.length} admin emails`);

    // 6. Get restaurant details
    const restaurant = await convexClient.query(api.restaurants.getRestaurant, {
      id: agent.restaurantId,
    });

    if (!restaurant) {
      console.error('Restaurant not found:', agent.restaurantId);
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 7. Trigger email notification with OpenAI analysis
    await convexClient.action(api.notifications.sendCallCompletionNotification, {
      conversationId: payload.conversation_id,
      agentId: agent._id,
      restaurantId: agent.restaurantId,
      agentName: agent.name,
      restaurantName: restaurant.name,
      transcript: payload.transcript,
      adminEmails,
      callData: {
        timestamp: payload.event_timestamp || Date.now() / 1000,
        duration: payload.metadata?.call_duration,
      },
    });

    console.log('Successfully triggered call completion notification');

    return NextResponse.json({
      success: true,
      conversation_id: payload.conversation_id,
    });
  } catch (error) {
    console.error('Error processing post-call webhook:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
