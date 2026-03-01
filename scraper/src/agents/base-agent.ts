/**
 * Base Agent
 * All IRL agents extend this class. Each agent uses Claude tool use
 * to reason, call tools, observe results, and loop until done.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface AgentTool {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input_schema: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentRunOptions {
  maxTurns?: number;
  model?: string;
  temperature?: number;
}

export abstract class BaseAgent {
  protected client: Anthropic;
  protected abstract systemPrompt: string;
  protected abstract tools: AgentTool[];

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Run the agentic loop:
   * 1. Send messages + tools to Claude
   * 2. If Claude calls a tool, execute it and append result
   * 3. Repeat until Claude stops using tools (end_turn)
   */
  protected async runLoop(
    userMessage: string,
    options: AgentRunOptions = {}
  ): Promise<string> {
    const { maxTurns = 10, model = 'claude-haiku-4-5-20251001', temperature = 0 } = options;

    const anthropicTools: Anthropic.Tool[] = this.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool['input_schema'],
    }));

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    let turns = 0;
    let finalText = '';

    while (turns < maxTurns) {
      turns++;

      const response = await this.client.messages.create({
        model,
        max_tokens: 1024,
        temperature,
        system: this.systemPrompt,
        tools: anthropicTools,
        messages,
      });

      // Collect text from this turn
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText = block.text;
        }
      }

      // If no more tool calls, we're done
      if (response.stop_reason === 'end_turn') {
        break;
      }

      // Process tool calls
      if (response.stop_reason === 'tool_use') {
        // Add the assistant's response to messages
        messages.push({ role: 'assistant', content: response.content });

        // Execute each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const tool = this.tools.find((t) => t.name === block.name);
            let result: unknown;

            if (!tool) {
              result = { error: `Unknown tool: ${block.name}` };
            } else {
              try {
                result = await tool.handler(block.input as Record<string, unknown>);
              } catch (err) {
                result = { error: String(err) };
              }
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        // Add tool results to messages for next turn
        messages.push({ role: 'user', content: toolResults });
      }
    }

    return finalText;
  }
}
