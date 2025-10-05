import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    const { agentId, areaCode = '415' } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Step 1: Search for available phone numbers in Twilio
    const availableNumbers = await client
      .availablePhoneNumbers('US')
      .local.list({
        areaCode: areaCode,
        limit: 1,
      });

    if (!availableNumbers || availableNumbers.length === 0) {
      throw new Error(`No phone numbers available in area code ${areaCode}`);
    }

    const phoneNumber = availableNumbers[0].phoneNumber;

    // Step 2: Purchase the phone number from Twilio (no webhook needed)
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
    });

    // Step 3: Import the phone number into ElevenLabs
    const elevenLabsResponse = await fetch(
      'https://api.elevenlabs.io/v1/convai/phone-numbers',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: purchasedNumber.phoneNumber,
          label: `Agent ${agentId}`,
          sid: process.env.TWILIO_ACCOUNT_SID!,
          token: process.env.TWILIO_AUTH_TOKEN!,
          provider: 'twilio',
          supports_inbound: true,
          supports_outbound: true,
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const error = await elevenLabsResponse.text();
      console.error('Failed to import phone number to ElevenLabs:', error);
      // Clean up: delete the Twilio number if ElevenLabs import fails
      await client.incomingPhoneNumbers(purchasedNumber.sid).remove();
      throw new Error('Failed to import phone number to ElevenLabs');
    }

    const elevenLabsData = await elevenLabsResponse.json();

    // Step 4: Associate the phone number with the agent
    const associateResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${elevenLabsData.phone_number_id}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
        }),
      }
    );

    if (!associateResponse.ok) {
      const error = await associateResponse.text();
      console.error('Failed to associate phone number with agent:', error);
      throw new Error('Failed to associate phone number with agent');
    }

    return NextResponse.json({
      phoneNumber: purchasedNumber.phoneNumber,
      phoneNumberSid: purchasedNumber.sid,
      elevenLabsPhoneNumberId: elevenLabsData.phone_number_id,
      success: true,
    });
  } catch (error) {
    console.error('Error provisioning phone number:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to provision phone number',
      },
      { status: 500 }
    );
  }
}
