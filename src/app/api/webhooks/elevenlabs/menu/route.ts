import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number; // in cents
  active: boolean;
  allergens?: string[];
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

interface MenuResponse {
  venue_id: string;
  categories: MenuCategory[];
}

/**
 * Format price from cents to dollars
 */
function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

/**
 * Format menu data into a readable string for the AI agent
 */
function formatMenuForAgent(menuData: MenuResponse): string {
  const lines: string[] = ['Here is our current menu:\n'];

  for (const category of menuData.categories) {
    lines.push(`\n## ${category.name}`);

    for (const item of category.items) {
      if (!item.active) continue; // Skip inactive items

      let itemLine = `- ${item.name}: ${formatPrice(item.price)}`;
      if (item.description) {
        itemLine += ` - ${item.description}`;
      }
      if (item.allergens && item.allergens.length > 0) {
        itemLine += ` (Contains: ${item.allergens.join(', ')})`;
      }
      lines.push(itemLine);
    }
  }

  return lines.join('\n');
}

/**
 * Webhook endpoint for ElevenLabs agent to fetch restaurant menu from The Account POS
 */
export async function POST(req: NextRequest) {
  try {
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

    console.log('[Menu Webhook] Fetching menu for restaurant:', restaurantId);

    const convex = getConvexClient();

    // 1. Get The Account integration for this restaurant
    const integration = await convex.query(api.integrations.getByProviderInternal, {
      restaurantId: restaurantId as Id<'restaurants'>,
      provider: 'the_account',
    });

    if (!integration || integration.status !== 'connected') {
      return NextResponse.json(
        {
          success: false,
          message: 'Menu is not available at the moment. Please ask about our specials instead.',
        },
        { status: 200 } // Return 200 so agent gets the message
      );
    }

    if (!integration.apiKey || !integration.tenantSlug) {
      console.error('[Menu Webhook] Missing credentials for restaurant:', restaurantId);
      return NextResponse.json(
        {
          success: false,
          message: 'Menu is temporarily unavailable. Please ask about our specials.',
        },
        { status: 200 }
      );
    }

    // 2. Determine API URL based on DEV_MODE
    const isDevMode = process.env.DEV_MODE === 'true';
    const menuUrl = isDevMode
      ? 'http://localhost:9090/api/v2/phone-orders/menu'
      : `https://${integration.tenantSlug}.theaccount.app/api/v2/phone-orders/menu`;

    console.log(`[Menu Webhook] Fetching from ${menuUrl} (DEV_MODE=${isDevMode})`);

    // 3. Fetch menu from The Account API
    const response = await fetch(menuUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': integration.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Menu Webhook] API error:', response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          message: 'I was unable to retrieve the menu. Let me tell you about some of our popular items instead.',
        },
        { status: 200 }
      );
    }

    const menuData: MenuResponse = await response.json();

    // 4. Format menu for the AI agent
    const formattedMenu = formatMenuForAgent(menuData);

    return NextResponse.json({
      success: true,
      message: formattedMenu,
      category_count: menuData.categories.length,
      item_count: menuData.categories.reduce(
        (sum, cat) => sum + cat.items.filter((i) => i.active).length,
        0
      ),
    });
  } catch (error) {
    console.error('[Menu Webhook] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'I encountered an issue retrieving the menu. Can I help you with something else?',
      },
      { status: 200 } // Return 200 so agent gets a response
    );
  }
}
