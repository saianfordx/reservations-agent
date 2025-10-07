import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';

/**
 * Get aggregated statistics for a restaurant
 * Includes call metrics from ElevenLabs
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = id as Id<'restaurants'>;

    console.log('Fetching stats for restaurant:', restaurantId);

    // Get all agents for this restaurant from Convex using HTTP client
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    // @ts-expect-error - TypeScript has issues with deep Convex type inference
    const agents = (await client.query(api.agents.getByRestaurantServerSide, { restaurantId })) as Array<{
      elevenLabsAgentId: string;
    }>;
    console.log('Found agents:', agents?.length || 0);

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        totalCalls: 0,
        avgCallTimeMins: 0,
        totalMinutes: 0,
      });
    }

    // Fetch conversations for all agents from ElevenLabs
    const conversationsPromises = agents.map(async (agent) => {
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agent.elevenLabsAgentId}&page_size=100`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            },
          }
        );

        if (!response.ok) {
          console.error(`Failed to fetch conversations for agent ${agent.elevenLabsAgentId}`);
          return [];
        }

        const data = await response.json();
        return data.conversations || [];
      } catch (error) {
        console.error(`Error fetching conversations for agent ${agent.elevenLabsAgentId}:`, error);
        return [];
      }
    });

    const conversationsArrays = await Promise.all(conversationsPromises);
    const allConversations = conversationsArrays.flat();

    console.log('Total conversations fetched:', allConversations.length);

    // Calculate statistics
    const totalCalls = allConversations.length;
    const totalDurationSecs = allConversations.reduce(
      (sum, conv) => sum + (conv.call_duration_secs || 0),
      0
    );
    const totalMinutes = Math.floor(totalDurationSecs / 60);
    const avgCallTimeSecs = totalCalls > 0 ? totalDurationSecs / totalCalls : 0;
    const avgCallTimeMins = avgCallTimeSecs / 60;

    const result = {
      totalCalls,
      avgCallTimeMins,
      totalMinutes,
    };

    console.log('Returning stats:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching restaurant stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant statistics' },
      { status: 500 }
    );
  }
}
