import type { WebSocket } from "ws";
import type { RetellRequest, RetellResponse, AppConfig } from "./types.js";
import { Conversation } from "./conversation.js";
import { LLMClient } from "./llm-client.js";
import { cleanForTTS } from "./voice-utils.js";

/**
 * Handles Retell WebSocket protocol for a single call
 */
export class RetellHandler {
  private ws: WebSocket;
  private conversation: Conversation;
  private llmClient: LLMClient;
  private responseId: number = 0;
  private callId: string;

  constructor(ws: WebSocket, callId: string, config: AppConfig) {
    this.ws = ws;
    this.callId = callId;
    this.conversation = new Conversation(callId);
    this.llmClient = new LLMClient(config);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as RetellRequest;
        await this.handleMessage(message);
      } catch (error) {
        console.error(`[${this.callId}] Error parsing message:`, error);
      }
    });

    this.ws.on("close", () => {
      console.log(`[${this.callId}] Connection closed`);
    });

    this.ws.on("error", (error) => {
      console.error(`[${this.callId}] WebSocket error:`, error);
    });
  }

  private async handleMessage(message: RetellRequest): Promise<void> {
    console.log(`[${this.callId}] Received: ${message.interaction_type}`);

    switch (message.interaction_type) {
      case "ping_pong":
        // Respond to ping with pong
        this.sendPong(message.response_id);
        break;

      case "update_only":
        // Just update transcript, no response needed
        if (message.transcript) {
          this.conversation.syncFromTranscript(message.transcript);
        }
        break;

      case "response_required":
      case "reminder_required":
        // Need to generate a response
        if (message.transcript) {
          await this.generateAndSendResponse(message);
        }
        break;
    }
  }

  private sendPong(timestamp?: number): void {
    const pong = {
      response_type: "pong",
      timestamp: timestamp,
    };
    this.ws.send(JSON.stringify(pong));
  }

  private async generateAndSendResponse(message: RetellRequest): Promise<void> {
    if (!message.transcript || message.transcript.length === 0) {
      return;
    }

    // Sync conversation from full transcript
    this.conversation.syncFromTranscript(message.transcript);

    // Get the latest user message for logging
    const userMessage = this.conversation.getLatestUserMessage(message.transcript);
    if (userMessage) {
      console.log(`[${this.callId}] User: ${userMessage.slice(0, 100)}...`);
    }

    // Increment response ID for this response
    this.responseId++;
    const currentResponseId = this.responseId;

    // Buffer for accumulating chunks before sending
    let buffer = "";
    const CHUNK_SIZE = 20; // Characters to accumulate before sending

    // Stream response from LLM
    const fullResponse = await this.llmClient.streamResponse(
      this.conversation.getMessages(),
      (chunk, done) => {
        if (done) {
          // Send any remaining buffer content as final chunk
          if (buffer.length > 0) {
            const cleanedBuffer = cleanForTTS(buffer);
            this.sendResponse(currentResponseId, cleanedBuffer, false, false);
          }
          // Send completion signal
          this.sendResponse(currentResponseId, "", true, false);
          console.log(`[${this.callId}] Response complete`);
        } else {
          buffer += chunk;

          // Send chunks periodically for smoother TTS
          if (buffer.length >= CHUNK_SIZE) {
            const cleanedChunk = cleanForTTS(buffer);
            this.sendResponse(currentResponseId, cleanedChunk, false, false);
            buffer = "";
          }
        }
      }
    );

    // Add the assistant response to conversation history
    this.conversation.addAssistantMessage(fullResponse);
  }

  private sendResponse(
    responseId: number,
    content: string,
    contentComplete: boolean,
    endCall: boolean
  ): void {
    const response: RetellResponse = {
      response_id: responseId,
      content,
      content_complete: contentComplete,
      end_call: endCall,
    };

    try {
      this.ws.send(JSON.stringify(response));
    } catch (error) {
      console.error(`[${this.callId}] Error sending response:`, error);
    }
  }

  /**
   * End the call gracefully
   */
  endCall(): void {
    this.sendResponse(this.responseId, "Goodbye!", true, true);
  }

  /**
   * Get call metadata
   */
  getMetadata() {
    return this.conversation.getMetadata();
  }
}
