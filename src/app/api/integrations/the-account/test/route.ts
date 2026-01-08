import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, tenantSlug, apiKey } = body;

    if (!tenantSlug || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!apiKey.startsWith('po_')) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key format. API key should start with "po_"' },
        { status: 400 }
      );
    }

    // Validate tenant slug format (no spaces, lowercase)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(tenantSlug)) {
      return NextResponse.json(
        { success: false, message: 'Invalid tenant slug format. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }

    // Construct the webhook URL based on DEV_MODE
    const isDevMode = process.env.DEV_MODE === 'true';
    const webhookUrl = isDevMode
      ? 'http://localhost:9090/api/v2/phone-orders/webhook'
      :`https://the-account.vortex.studio/tn/${tenantSlug}/api/v2/phone-orders/webhook`;

    // Test the connection with a HEAD request
    // (or OPTIONS to avoid creating an order)
    try {
      const response = await fetch(webhookUrl, {
        method: 'OPTIONS',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      // Check if the API key was accepted
      // 401 indicates invalid API key
      if (response.status === 401) {
        // Update integration status in database
        if (restaurantId) {
          const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (client.mutation as any)(api.integrations.updateTestResult, {
            restaurantId: restaurantId as Id<'restaurants'>,
            provider: 'the_account',
            success: false,
            message: 'Invalid API key',
          });
        }

        return NextResponse.json(
          { success: false, message: 'Invalid API key. Please check your credentials in The Account dashboard.' },
          { status: 401 }
        );
      }

      // Success - server is reachable (200, 204, or even 405 Method Not Allowed means server is up)
      if (restaurantId) {
        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.mutation as any)(api.integrations.updateTestResult, {
          restaurantId: restaurantId as Id<'restaurants'>,
          provider: 'the_account',
          success: true,
          message: 'success',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Connection successful! The Account integration is working.',
      });
    } catch {
      // Network error or invalid domain
      const errorMessage = `Could not reach ${tenantSlug}.theaccount.app. Please verify the tenant slug is correct.`;

      if (restaurantId) {
        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.mutation as any)(api.integrations.updateTestResult, {
          restaurantId: restaurantId as Id<'restaurants'>,
          provider: 'the_account',
          success: false,
          message: errorMessage,
        });
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error testing The Account connection:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
