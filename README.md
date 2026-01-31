# ClawBot Speaks

A voice server that connects [Retell AI](https://retellai.com) to [OpenClaw](https://github.com/your-org/openclaw), enabling phone conversations with full access to OpenClaw's tools, memory, and agent infrastructure.

## How It Works

```
Phone Call → Retell (STT) → ClawBot Speaks → OpenClaw (/v1/responses) → Back to Retell (TTS) → Phone Call
```

1. User calls a phone number configured in Retell
2. Retell transcribes speech and sends text via WebSocket
3. ClawBot Speaks forwards the conversation to OpenClaw's OpenResponses API
4. OpenClaw processes with full tool access and streams the response
5. Response is cleaned for TTS and sent back to Retell
6. Retell converts the response to speech for the caller

## Prerequisites

- Node.js 18+
- [Retell AI](https://retellai.com) account
- OpenClaw gateway with OpenResponses enabled:
  ```json
  {
    "gateway": {
      "openResponses": {
        "enabled": true
      }
    }
  }
  ```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# - RETELL_API_KEY: Your Retell API key
# - OPENCLAW_URL: Your OpenClaw gateway URL (e.g., http://localhost:3000)

# Start the server
npm run dev
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RETELL_API_KEY` | Yes | - | Your Retell API key |
| `OPENCLAW_URL` | Yes | - | OpenClaw gateway URL |
| `OPENCLAW_API_KEY` | No | - | API key if OpenClaw requires auth |
| `PORT` | No | 8080 | WebSocket server port |
| `SYSTEM_PROMPT` | No | See below | Voice-specific instructions |

### System Prompt

The default prompt instructs the assistant to:
- Keep responses brief (1-3 sentences)
- Speak naturally as if on a phone call
- Avoid markdown, URLs, and technical formatting

This is passed as `instructions` to the OpenResponses API.

## Connecting to Retell

1. Go to your [Retell Dashboard](https://dashboard.retellai.com)
2. Create or edit an agent
3. Select "Custom LLM" as the LLM type
4. Set the WebSocket URL to `ws://your-server:8080`
5. Assign a phone number to the agent
6. Call the number to test

For local development, use ngrok:
```bash
ngrok http 8080
# Use the wss:// URL in Retell
```

## Project Structure

```
clawbotspeaks/
├── src/
│   ├── index.ts           # Entry point
│   ├── config.ts          # Environment configuration
│   ├── server.ts          # WebSocket server
│   ├── retell-handler.ts  # Retell protocol implementation
│   ├── llm-client.ts      # OpenClaw OpenResponses client
│   ├── conversation.ts    # Per-call state management
│   ├── voice-utils.ts     # Text cleaning for TTS
│   └── types.ts           # TypeScript interfaces
├── tests/
│   └── voice-utils.test.ts
├── docs/
│   ├── retell-protocol.md
│   ├── configuration.md
│   └── deployment.md
└── package.json
```

## Architecture

### Flow

```
Retell WebSocket                    OpenClaw
     │                                  │
     │◄──── ClawBot Speaks ────────────►│
     │         (bridge)                 │
     │                                  │
  [STT/TTS]                    [Claude + Tools]
```

### OpenResponses Integration

ClawBot Speaks calls OpenClaw's `/v1/responses` endpoint:

```typescript
POST /v1/responses
{
  "input": [
    { "role": "user", "content": "What's on my calendar?" }
  ],
  "instructions": "Keep responses brief...",
  "stream": true
}
```

OpenClaw handles:
- Tool execution (calendar, email, etc.)
- Session/agent infrastructure
- Conversation memory (if configured)

### Voice Utils

Responses are cleaned for natural TTS:
- Strips markdown formatting
- Removes URLs and code blocks
- Truncates at sentence boundaries

## Development

```bash
npm run dev      # Start with hot reload
npm run build    # Compile TypeScript
npm start        # Run compiled code
npm test         # Run tests
```

## Why OpenClaw Integration?

Without OpenClaw, each call would be a fresh Claude instance with:
- No memory of previous calls
- No access to tools
- No integration with your systems

With OpenClaw, voice calls get:
- Full tool access (same as other channels)
- Shared agent infrastructure
- Consistent behavior across channels

## License

MIT
