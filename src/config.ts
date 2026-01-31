import { config as dotenvConfig } from "dotenv";
import type { AppConfig } from "./types.js";

// Load environment variables from .env file
dotenvConfig();

const DEFAULT_SYSTEM_PROMPT = `You are a helpful voice assistant. Keep your responses brief and conversational, typically 1-3 sentences.

Important guidelines for voice interactions:
- Speak naturally as if on a phone call
- Never use markdown, URLs, code blocks, or special formatting
- Don't use bullet points or numbered lists
- Avoid technical jargon unless the user uses it first
- If you need to list items, say them conversationally (e.g., "You could try A, B, or C")
- Ask clarifying questions if the request is unclear
- Be warm and personable while staying professional`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    retellApiKey: requireEnv("RETELL_API_KEY"),
    openclawUrl: requireEnv("OPENCLAW_URL"),
    openclawApiKey: process.env.OPENCLAW_API_KEY,
    port: parseInt(process.env.PORT || "8080", 10),
    systemPrompt: process.env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
  };
}
