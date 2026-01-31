import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { AppConfig } from "./types.js";
import { RetellHandler } from "./retell-handler.js";

/**
 * WebSocket server for handling Retell connections
 */
export class VoiceServer {
  private wss: WebSocketServer;
  private activeCalls: Map<string, RetellHandler> = new Map();
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.wss = new WebSocketServer({ port: config.port });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on("connection", (ws: WebSocket, request) => {
      const callId = this.extractCallId(request.url) || randomUUID();

      console.log(`[${callId}] New connection established`);

      const handler = new RetellHandler(ws, callId, this.config);
      this.activeCalls.set(callId, handler);

      ws.on("close", () => {
        this.activeCalls.delete(callId);
        console.log(`[${callId}] Connection removed. Active calls: ${this.activeCalls.size}`);
      });
    });

    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });
  }

  private extractCallId(url: string | undefined): string | null {
    if (!url) return null;

    try {
      // URL might be like /ws?call_id=xxx or /call_id
      const searchParams = new URLSearchParams(url.split("?")[1] || "");
      return searchParams.get("call_id") || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the number of active calls
   */
  getActiveCallCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Get info about all active calls
   */
  getActiveCalls(): Array<{ callId: string; startTime: Date; messageCount: number }> {
    return Array.from(this.activeCalls.entries()).map(([callId, handler]) => {
      const metadata = handler.getMetadata();
      return {
        callId,
        startTime: metadata.startTime,
        messageCount: metadata.messageCount,
      };
    });
  }

  /**
   * Gracefully shut down the server
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down server...");

    // End all active calls
    for (const [callId, handler] of this.activeCalls) {
      console.log(`[${callId}] Ending call for shutdown`);
      handler.endCall();
    }

    // Close the server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log("Server shut down complete");
        resolve();
      });
    });
  }
}
