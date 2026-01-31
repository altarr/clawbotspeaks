/**
 * Retell protocol message types and application interfaces
 */

// Retell interaction types
export type InteractionType =
  | "response_required"
  | "reminder_required"
  | "update_only"
  | "ping_pong";

// Transcript entry from Retell
export interface TranscriptEntry {
  role: "agent" | "user";
  content: string;
}

// Incoming message from Retell WebSocket
export interface RetellRequest {
  interaction_type: InteractionType;
  transcript?: TranscriptEntry[];
  response_id?: number;
}

// Outgoing response to Retell WebSocket
export interface RetellResponse {
  response_id: number;
  content: string;
  content_complete: boolean;
  end_call: boolean;
}

// Configuration for the application
export interface AppConfig {
  retellApiKey: string;
  openclawUrl: string;
  openclawApiKey?: string;
  port: number;
  systemPrompt: string;
}

// Message format for LLM conversation history
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// Callback for streaming LLM responses
export type StreamCallback = (chunk: string, done: boolean) => void;

// Call metadata for tracking active calls
export interface CallMetadata {
  callId: string;
  startTime: Date;
  messageCount: number;
}
