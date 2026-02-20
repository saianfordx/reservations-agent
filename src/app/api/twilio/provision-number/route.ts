import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    const { agentId, areaCode = '415', phoneNumber: selectedPhoneNumber, countryCode = 'US' } = await req.json();

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

    let phoneNumber: string;

    if (selectedPhoneNumber) {
      // Use the specific phone number the user selected
      phoneNumber = selectedPhoneNumber;
    } else {
      // Fallback: Search for available phone numbers by area code
      const availableNumbers = await client
        .availablePhoneNumbers(countryCode)
        .local.list({
          areaCode: areaCode,
          limit: 1,
        });

      if (!availableNumbers || availableNumbers.length === 0) {
        throw new Error(`No phone numbers available in area code ${areaCode}`);
      }

      phoneNumber = availableNumbers[0].phoneNumber;
    }

    // Step 2: Look up existing addresses on the Twilio account
    // Some phone numbers (especially international) require an address for regulatory compliance
    const addresses = await client.addresses.list({ limit: 1 });
    const addressSid = addresses.length > 0 ? addresses[0].sid : undefined;

    // Step 2b: Look up approved regulatory compliance bundles for non-US countries
    // Countries like Mexico require a bundleSid to purchase local numbers
    let bundleSid: string | undefined;
    if (countryCode !== 'US') {
      // First try with numberType filter
      let bundles = await client.numbers.v2.regulatoryCompliance.bundles.list({
        status: 'twilio-approved',
        isoCountry: countryCode,
        numberType: 'local',
        limit: 1,
      });

      // If no results, try without numberType filter (bundle may cover all types)
      if (bundles.length === 0) {
        bundles = await client.numbers.v2.regulatoryCompliance.bundles.list({
          status: 'twilio-approved',
          isoCountry: countryCode,
          limit: 1,
        });
      }

      if (bundles.length > 0) {
        bundleSid = bundles[0].sid;
        console.log(`Found approved bundle ${bundleSid} for country ${countryCode}`);
      } else {
        console.warn(`No approved bundles found for country ${countryCode}`);
        return NextResponse.json(
          {
            error:
              `No approved Regulatory Compliance Bundle found for country ${countryCode}. ` +
              'Please create and get approval for a bundle at ' +
              'https://www.twilio.com/console/phone-numbers/regulatory-compliance/bundles ' +
              'before purchasing a phone number. Bundle approval may take up to 2 business days.',
          },
          { status: 400 }
        );
      }
    }

    // Step 3: Purchase the phone number from Twilio (no webhook needed)
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      ...(addressSid ? { addressSid } : {}),
      ...(bundleSid ? { bundleSid } : {}),
    });

    // Step 4: Import the phone number into ElevenLabs
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

    // Step 5: Associate the phone number with the agent
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

    // Check for Twilio regulatory compliance errors
    const twilioError = error as { code?: number };
    if (twilioError.code === 21631) {
      return NextResponse.json(
        {
          error:
            'This phone number requires a registered address in your Twilio account. Please add an address at https://www.twilio.com/console/phone-numbers/regulatory-compliance and try again.',
        },
        { status: 400 }
      );
    }

    if (twilioError.code === 21649) {
      return NextResponse.json(
        {
          error:
            'This phone number requires a Regulatory Compliance Bundle in your Twilio account. Please create and get approval for a bundle at https://www.twilio.com/console/phone-numbers/regulatory-compliance/bundles and try again.',
        },
        { status: 400 }
      );
    }

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
