import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Get invitation details from a Clerk invitation ticket
 * Decodes the JWT and fetches email + organization name
 */
export async function POST(req: NextRequest) {
  try {
    const { ticket } = await req.json();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket is required' }, { status: 400 });
    }

    // Decode JWT ticket (it's base64 encoded)
    // JWT format: header.payload.signature
    const parts = ticket.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid ticket format' }, { status: 400 });
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    const organizationId = payload.oid;
    const invitationId = payload.sid;

    if (!organizationId || !invitationId) {
      return NextResponse.json({ error: 'Invalid ticket payload' }, { status: 400 });
    }

    // Get Clerk client instance
    const client = await clerkClient();

    // Fetch invitation details
    const invitation = await client.organizations.getOrganizationInvitation({
      organizationId,
      invitationId,
    });

    // Fetch organization details
    const organization = await client.organizations.getOrganization({
      organizationId,
    });

    return NextResponse.json({
      email: invitation.emailAddress,
      organizationName: organization.name,
      organizationId,
      invitationId,
    });
  } catch (error) {
    console.error('Error fetching invitation details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation details' },
      { status: 500 }
    );
  }
}
