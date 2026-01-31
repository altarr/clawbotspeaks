import type { ConversationMessage, StreamCallback, AppConfig } from "./types.js";

/**
 * Client for interacting with OpenClaw's OpenResponses API
 */
export class LLMClient {
  private baseUrl: string;
  private apiKey?: string;
  private systemPrompt: string;

  constructor(config: AppConfig) {
    // Remove trailing slash if present
    this.baseUrl = config.openclawUrl.replace(/\/$/, "");
    this.apiKey = config.openclawApiKey;
    this.systemPrompt = config.systemPrompt;
  }

  /**
   * Generate a streaming response from OpenClaw
   */
  async streamResponse(
    messages: ConversationMessage[],
    onChunk: StreamCallback
  ): Promise<string> {
    let fullResponse = "";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      // Build input array in OpenResponses format
      const input = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${this.baseUrl}/v1/responses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          input,
          instructions: this.systemPrompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenClaw error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              continue;
            }

            try {
              const event = JSON.parse(data);

              // Handle different event types from OpenResponses
              if (event.type === "response.output_text.delta") {
                const chunk = event.delta || "";
                fullResponse += chunk;
                onChunk(chunk, false);
              } else if (event.type === "response.output_item.done") {
                // Item complete, extract text if present
                if (event.item?.content?.[0]?.text) {
                  // This is the full text, but we've been streaming deltas
                }
              } else if (event.type === "response.completed" || event.type === "response.done") {
                // Response complete
              } else if (event.delta) {
                // Generic delta event
                fullResponse += event.delta;
                onChunk(event.delta, false);
              } else if (event.choices?.[0]?.delta?.content) {
                // OpenAI-compatible format
                const chunk = event.choices[0].delta.content;
                fullResponse += chunk;
                onChunk(chunk, false);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      onChunk("", true);
      return fullResponse;
    } catch (error) {
      const errorMessage = "I'm sorry, I encountered an error. Could you please try again?";
      onChunk(errorMessage, true);
      console.error("OpenClaw error:", error);
      return errorMessage;
    }
  }

  /**
   * Generate a non-streaming response from OpenClaw
   */
  async generateResponse(messages: ConversationMessage[]): Promise<string> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const input = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${this.baseUrl}/v1/responses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          input,
          instructions: this.systemPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenClaw error: ${response.status} ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();

      // Extract text from OpenResponses format
      if (data.output?.[0]?.content?.[0]?.text) {
        return data.output[0].content[0].text as string;
      }

      // Fallback formats
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content as string;
      }

      if (typeof data.content === "string") {
        return data.content;
      }

      return "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("OpenClaw error:", error);
      return "I'm sorry, I encountered an error. Could you please try again?";
    }
  }
}
