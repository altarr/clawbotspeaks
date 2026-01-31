import type { ConversationMessage, TranscriptEntry, CallMetadata } from "./types.js";

/**
 * Manages conversation state for a single call
 */
export class Conversation {
  private messages: ConversationMessage[] = [];
  private metadata: CallMetadata;

  constructor(callId: string) {
    this.metadata = {
      callId,
      startTime: new Date(),
      messageCount: 0,
    };
  }

  /**
   * Add a user message to the conversation
   */
  addUserMessage(content: string): void {
    if (content.trim()) {
      this.messages.push({ role: "user", content: content.trim() });
      this.metadata.messageCount++;
    }
  }

  /**
   * Add an assistant message to the conversation
   */
  addAssistantMessage(content: string): void {
    if (content.trim()) {
      this.messages.push({ role: "assistant", content: content.trim() });
      this.metadata.messageCount++;
    }
  }

  /**
   * Sync conversation state from Retell transcript
   * This handles the case where Retell sends the full transcript
   */
  syncFromTranscript(transcript: TranscriptEntry[]): void {
    // Clear existing messages and rebuild from transcript
    this.messages = [];

    for (const entry of transcript) {
      const role = entry.role === "agent" ? "assistant" : "user";
      if (entry.content.trim()) {
        this.messages.push({ role, content: entry.content.trim() });
      }
    }

    this.metadata.messageCount = this.messages.length;
  }

  /**
   * Get the latest user message from the transcript
   */
  getLatestUserMessage(transcript: TranscriptEntry[]): string | null {
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role === "user" && transcript[i].content.trim()) {
        return transcript[i].content.trim();
      }
    }
    return null;
  }

  /**
   * Get all messages formatted for LLM API call
   */
  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get conversation metadata
   */
  getMetadata(): CallMetadata {
    return { ...this.metadata };
  }

  /**
   * Get the number of messages in the conversation
   */
  get length(): number {
    return this.messages.length;
  }

  /**
   * Clear the conversation history
   */
  clear(): void {
    this.messages = [];
    this.metadata.messageCount = 0;
  }
}
