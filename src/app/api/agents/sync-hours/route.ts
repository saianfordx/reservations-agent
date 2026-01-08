import { NextRequest, NextResponse } from 'next/server';
import { generateAgentPrompt, OperatingHours } from '@/lib/elevenlabs/agent-prompt';
import { fetchAction } from 'convex/nextjs';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

/**
 * POST /api/agents/sync-hours
 *
 * Syncs agent prompts with updated restaurant hours.
 * Called automatically when restaurant hours are updated.
 */
export async function POST(req: NextRequest) {
  try {
    const { restaurantId, restaurantName, operatingHours } = await req.json();

    if (!restaurantId || !restaurantName || !operatingHours) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, restaurantName, operatingHours' },
        { status: 400 }
      );
    }

    // Generate the new prompt with the updated hours
    const newPrompt = generateAgentPrompt(restaurantName, operatingHours as OperatingHours);

    // Call the Convex action to sync all agents for this restaurant
    // @ts-expect-error - Type instantiation is excessively deep due to complex Convex action type inference
    const result = await fetchAction(api.agents.syncPromptWithHours, {
      restaurantId: restaurantId as Id<'restaurants'>,
      restaurantName,
      operatingHours,
      newPrompt,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error syncing agent hours:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync agent hours' },
      { status: 500 }
    );
  }
}
