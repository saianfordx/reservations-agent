import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../convex/_generated/api';
import crypto from 'crypto';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Verify ElevenLabs webhook signature
 * Format: "t=timestamp,v0=hash"
 * Message: "timestamp.request_body"
 */
function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    // Parse signature header: "t=timestamp,v0=hash"
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const hash = parts.find(p => p.startsWith('v0='))?.split('=')[1];

    if (!timestamp || !hash) {
      console.error('Invalid signature header format');
      return false;
    }

    // Create message: "timestamp.request_body"
    const message = `${timestamp}.${payload}`;

    // Compute HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const expectedHash = hmac.digest('hex');

    // Compare hashes
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * ElevenLabs post-call webhook handler
 * Receives call transcripts and triggers AI analysis + email notifications
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔔 POST-CALL WEBHOOK RECEIVED');

    // 1. Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('elevenlabs-signature') || req.headers.get('ElevenLabs-Signature');

    console.log('Headers:', {
      signature: signature ? 'present' : 'missing',
      contentType: req.headers.get('content-type'),
    });

    // 2. Verify webhook signature (if secret is configured)
    if (process.env.ELEVENLABS_WEBHOOK_SECRET && signature) {
      console.log('Verifying webhook signature...');
      const isValid = verifyWebhookSignature(
        rawBody,
        signature,
        process.env.ELEVENLABS_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      console.log('✅ Signature verified');
    } else if (process.env.ELEVENLABS_WEBHOOK_SECRET && !signature) {
      console.warn('⚠️ Webhook secret configured but no signature provided');
    }

    // 3. Parse webhook payload
    const payload = JSON.parse(rawBody);

    console.log('📞 Received post-call webhook:', {
      type: payload.type,
      has_data: !!payload.data,
      conversation_id: payload.conversation_id || payload.data?.conversation_id,
      agent_id: payload.agent_id || payload.data?.agent_id,
    });

    // Extract data from payload (might be in root or in data object)
    const data = payload.data || payload;
    const conversationId = data.conversation_id;
    const agentId = data.agent_id;
    const transcriptData = data.transcript;

    // Validate required fields
    if (!conversationId || !agentId || !transcriptData) {
      console.error('Missing required fields in webhook payload:', {
        has_conversation_id: !!conversationId,
        has_agent_id: !!agentId,
        has_transcript: !!transcriptData,
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert transcript array to formatted string
    let transcript: string;
    if (Array.isArray(transcriptData)) {
      // ElevenLabs sends transcript as array of conversation turns
      transcript = transcriptData
        .map((turn: { role?: string; message?: string }) => {
          const role = turn.role === 'agent' ? 'Agent' : 'User';
          const message = turn.message || '';
          return `${role}: ${message}`;
        })
        .join('\n');
    } else {
      // Fallback if it's already a string
      transcript = String(transcriptData);
    }

    console.log('Formatted transcript:', transcript);

    // Extract caller phone number and call metadata from ElevenLabs webhook
    const metadata = data.metadata;
    const phoneCallData = metadata?.phone_call?.body;
    const callerPhoneNumber = phoneCallData?.from || null;
    const restaurantPhoneNumber = phoneCallData?.to || null;
    const callProvider = metadata?.phone_call?.type || null;

    console.log('📞 Call metadata extracted:', {
      caller: callerPhoneNumber,
      restaurant: restaurantPhoneNumber,
      provider: callProvider,
      has_metadata: !!metadata,
      has_phone_call_data: !!phoneCallData,
    });

    // 4. Process webhook via Convex public action (it will do all lookups internally)
    const result = await convexClient.action(api.notifications.processPostCallWebhook, {
      conversationId,
      elevenLabsAgentId: agentId,
      transcript,
      eventTimestamp: payload.event_timestamp || data.event_timestamp,
      callDuration: data.metadata?.call_duration,
      callerPhoneNumber,
      restaurantPhoneNumber,
      callProvider,
    });

    if (!result.success) {
      console.error('❌ Webhook processing failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log('✅ Successfully processed post-call webhook');

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
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
