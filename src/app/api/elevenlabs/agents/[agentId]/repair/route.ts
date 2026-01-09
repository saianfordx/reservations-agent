import { NextRequest, NextResponse } from 'next/server';
import { getAllToolsWithMenu } from '@/lib/elevenlabs/tools';
import { generateAgentPromptWithTools, OperatingHours } from '@/lib/elevenlabs/agent-prompt';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';

/**
 * Repair endpoint to fix agents that may have lost their tools configuration
 * This fetches the current agent config, and re-applies the tools with correct webhook URLs
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId: elevenLabsAgentId } = await params;
    const { restaurantId, convexAgentId, restaurantName } = await req.json();

    if (!restaurantId || !convexAgentId || !restaurantName) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, convexAgentId, restaurantName' },
        { status: 400 }
      );
    }

    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const convex = getConvexClient();

    // Check if menu tool is enabled for this agent
    let isMenuToolEnabled = false;
    try {
      isMenuToolEnabled = await convex.query(api.agentTools.isToolEnabled, {
        agentId: convexAgentId as Id<'agents'>,
        toolName: 'menu',
      });
    } catch (e) {
      console.error('Error checking menu tool status:', e);
      // Default to false if check fails
    }

    // Fetch the agent to get the agent name
    let agentName = 'Assistant';
    try {
      const agents = await convex.query(api.agents.getByRestaurantServerSide, {
        restaurantId: restaurantId as Id<'restaurants'>,
      });
      const agent = agents.find((a: { _id: string; name?: string }) => a._id === convexAgentId);
      if (agent?.name) {
        agentName = agent.name;
      }
    } catch (e) {
      console.error('Error fetching agent:', e);
      // Use default name if fetch fails
    }

    // Fetch the restaurant to get operating hours
    let operatingHours: OperatingHours | undefined;
    try {
      const restaurant = await convex.query(api.restaurants.getRestaurantPublic, {
        id: restaurantId as Id<'restaurants'>,
      });
      operatingHours = restaurant?.operatingHours as OperatingHours | undefined;
    } catch (e) {
      console.error('Error fetching restaurant:', e);
      // Continue without operating hours if fetch fails
    }

    // Get ALL tools (both reservations and orders) with correct webhook URLs
    // Include menu tool if it's enabled
    const tools = getAllToolsWithMenu(webhookBaseUrl, restaurantId, convexAgentId, isMenuToolEnabled);

    // Fetch current agent configuration to preserve knowledge_base
    const getResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!getResponse.ok) {
      const error = await getResponse.text();
      console.error('Failed to fetch agent:', error);
      throw new Error('Failed to fetch agent configuration');
    }

    const currentAgent = await getResponse.json();

    // Create the agent prompt using the helper function
    // Include agent name, operating hours, and menu tool instructions if enabled
    const agentPrompt = generateAgentPromptWithTools(restaurantName, agentName, operatingHours, { menu: isMenuToolEnabled });

    // Build the complete prompt config with both tools and knowledge_base
    const promptConfig: Record<string, unknown> = {
      prompt: agentPrompt,
      llm: 'gpt-4o-mini',
      tools: tools,
    };

    // Preserve knowledge_base if it exists
    if (currentAgent.conversation_config?.agent?.prompt?.knowledge_base) {
      promptConfig.knowledge_base = currentAgent.conversation_config.agent.prompt.knowledge_base;
    }

    // Update agent with repaired configuration
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: promptConfig,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to repair agent:', error);
      throw new Error('Failed to repair agent');
    }

    await response.json(); // Consume response

    return NextResponse.json({
      success: true,
      message: 'Agent repaired successfully. Tools have been restored with correct webhook URLs.',
      agent_id: elevenLabsAgentId,
    });
  } catch (error) {
    console.error('Error repairing agent:', error);
    return NextResponse.json(
      { error: 'Failed to repair agent' },
      { status: 500 }
    );
  }
}
