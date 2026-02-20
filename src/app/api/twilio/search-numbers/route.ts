import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    const { countryCode = 'US', digits } = await req.json();

    if (!digits || typeof digits !== 'string' || digits.length < 2) {
      return NextResponse.json(
        { error: 'Please enter at least 2 digits to search' },
        { status: 400 }
      );
    }

    // Only allow digits
    if (!/^\d+$/.test(digits)) {
      return NextResponse.json(
        { error: 'Please enter only numbers' },
        { status: 400 }
      );
    }

    const validCountries = ['US', 'MX'];
    if (!validCountries.includes(countryCode)) {
      return NextResponse.json(
        { error: `Unsupported country code: ${countryCode}` },
        { status: 400 }
      );
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Build search params based on country
    const searchParams: Record<string, unknown> = { limit: 10 };

    if (countryCode === 'US' && digits.length === 3) {
      // US area codes are exactly 3 digits
      searchParams.areaCode = parseInt(digits, 10);
    } else {
      // For MX or non-3-digit US searches, use contains with wildcard
      searchParams.contains = `${digits}*`;
    }

    const availableNumbers = await client
      .availablePhoneNumbers(countryCode)
      .local.list(searchParams);

    const results = availableNumbers.map((num) => ({
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      locality: num.locality,
      region: num.region,
      isoCountry: num.isoCountry,
      addressRequirements: num.addressRequirements,
      capabilities: {
        voice: num.capabilities.voice,
        sms: num.capabilities.sms,
        mms: num.capabilities.mms,
      },
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching phone numbers:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to search phone numbers',
      },
      { status: 500 }
    );
  }
}
