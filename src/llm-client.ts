import Anthropic from "@anthropic-ai/sdk";
import type { ConversationMessage, StreamCallback, AppConfig } from "./types.js";

/**
 * Client for interacting with Anthropic's Claude API
 */
export class LLMClient {
  private client: Anthropic;
  private systemPrompt: string;

  constructor(config: AppConfig) {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
    this.systemPrompt = config.systemPrompt;
  }

  /**
   * Generate a streaming response from Claude
   */
  async streamResponse(
    messages: ConversationMessage[],
    onChunk: StreamCallback
  ): Promise<string> {
    let fullResponse = "";

    try {
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: this.systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const chunk = event.delta.text;
          fullResponse += chunk;
          onChunk(chunk, false);
        }
      }

      onChunk("", true);
      return fullResponse;
    } catch (error) {
      const errorMessage = "I'm sorry, I encountered an error. Could you please try again?";
      onChunk(errorMessage, true);
      console.error("LLM error:", error);
      return errorMessage;
    }
  }

  /**
   * Generate a non-streaming response from Claude
   */
  async generateResponse(messages: ConversationMessage[]): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: this.systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const content = response.content[0];
      if (content.type === "text") {
        return content.text;
      }

      return "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("LLM error:", error);
      return "I'm sorry, I encountered an error. Could you please try again?";
    }
  }
}
