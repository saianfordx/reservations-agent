import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex-client';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';
import { getAllToolsWithMenu } from '@/lib/elevenlabs/tools';
import { generateAgentPromptWithTools, OperatingHours } from '@/lib/elevenlabs/agent-prompt';

/**
 * POST: Enable or disable the menu tool for an agent
 * This updates both the Convex database and the ElevenLabs agent configuration
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId: elevenLabsAgentId } = await params;
    const { restaurantId, convexAgentId, restaurantName, enable } = await req.json();

    if (!restaurantId || !convexAgentId || !restaurantName || enable === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, convexAgentId, restaurantName, enable' },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 1. Check if The Account integration exists and is connected (only when enabling)
    if (enable) {
      const integration = await convex.query(api.integrations.getByProviderInternal, {
        restaurantId: restaurantId as Id<'restaurants'>,
        provider: 'the_account',
      });

      if (!integration || integration.status !== 'connected') {
        return NextResponse.json(
          { error: 'The Account integration must be connected before enabling the menu tool' },
          { status: 400 }
        );
      }
    }

    // 2. Update Convex agentTools table (using server mutation - no auth required)
    await convex.mutation(api.agentTools.toggleToolServer, {
      agentId: convexAgentId as Id<'agents'>,
      toolName: 'menu',
      enabled: enable,
      config: enable ? { integrationProvider: 'the_account' } : undefined,
    });

    // 3. Fetch the agent to get the agent name
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

    // 4. Fetch the restaurant to get operating hours
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

    // 5. Fetch current agent configuration from ElevenLabs
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
      console.error('Failed to fetch agent configuration:', error);
      throw new Error('Failed to fetch agent configuration');
    }

    const currentAgent = await getResponse.json();

    // 6. Build updated tools array
    const tools = getAllToolsWithMenu(webhookBaseUrl, restaurantId, convexAgentId, enable);

    // 7. Build updated prompt with agent name, operating hours, and menu instructions if enabled
    const agentPrompt = generateAgentPromptWithTools(restaurantName, agentName, operatingHours, { menu: enable });

    // 8. Build the complete prompt config
    const promptConfig: Record<string, unknown> = {
      prompt: agentPrompt,
      llm: 'gpt-4o-mini',
      tools: tools,
    };

    // Preserve knowledge_base if it exists
    if (currentAgent.conversation_config?.agent?.prompt?.knowledge_base) {
      promptConfig.knowledge_base = currentAgent.conversation_config.agent.prompt.knowledge_base;
    }

    // 9. Update ElevenLabs agent
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
      console.error('Failed to update ElevenLabs agent:', error);
      throw new Error('Failed to update agent configuration');
    }

    await response.json(); // Consume response

    return NextResponse.json({
      success: true,
      message: enable
        ? 'Menu tool enabled successfully. The agent can now access the restaurant menu.'
        : 'Menu tool disabled successfully.',
      agent_id: elevenLabsAgentId,
      menu_tool_enabled: enable,
    });
  } catch (error) {
    console.error('Error configuring menu tool:', error);
    return NextResponse.json(
      { error: 'Failed to configure menu tool' },
      { status: 500 }
    );
  }
}
