import { loadConfig } from "./config.js";
import { VoiceServer } from "./server.js";

function main(): void {
  console.log("Starting ClawBot Speaks voice server...\n");

  // Load configuration
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error("Configuration error:", error instanceof Error ? error.message : error);
    console.error("\nPlease ensure you have a .env file with the required variables.");
    console.error("See .env.example for reference.");
    process.exit(1);
  }

  // Start the server
  const server = new VoiceServer(config);

  console.log(`Voice server started on port ${config.port}`);
  console.log(`WebSocket endpoint: ws://localhost:${config.port}`);
  console.log("\nReady to accept Retell connections.\n");

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await server.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Log active calls periodically
  setInterval(() => {
    const count = server.getActiveCallCount();
    if (count > 0) {
      console.log(`Active calls: ${count}`);
    }
  }, 60000);
}

main();
