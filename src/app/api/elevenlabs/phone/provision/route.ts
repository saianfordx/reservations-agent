import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Get available phone numbers
    const numbersResponse = await fetch(
      'https://api.elevenlabs.io/v1/convai/phone-numbers/available?country=US',
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!numbersResponse.ok) {
      throw new Error('Failed to get available phone numbers');
    }

    const numbers = await numbersResponse.json();

    if (!numbers.phone_numbers || numbers.phone_numbers.length === 0) {
      throw new Error('No phone numbers available');
    }

    // Take the first available number
    const phoneNumber = numbers.phone_numbers[0];

    // Purchase/assign the number to the agent
    const assignResponse = await fetch(
      'https://api.elevenlabs.io/v1/convai/phone-numbers/buy',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber.phone_number,
          agent_id: agentId,
        }),
      }
    );

    if (!assignResponse.ok) {
      const error = await assignResponse.text();
      console.error('Phone number assignment error:', error);
      throw new Error(`Failed to assign phone number: ${error}`);
    }

    const assignData = await assignResponse.json();

    return NextResponse.json({
      phoneNumber: phoneNumber.phone_number,
      phoneNumberId: assignData.phone_number_id || phoneNumber.phone_number,
      success: true,
    });
  } catch (error) {
    console.error('Error provisioning phone number:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to provision phone number',
      },
      { status: 500 }
    );
  }
}
