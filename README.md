# ClawBot Speaks

A voice server that connects [Retell AI](https://retellai.com) to Claude, enabling natural phone conversations powered by Anthropic's language model.

## How It Works

```
Phone Call → Retell (Speech-to-Text) → This Server → Claude → Back to Retell (Text-to-Speech) → Phone Call
```

1. User calls a phone number configured in Retell
2. Retell transcribes speech and sends text via WebSocket
3. This server forwards the conversation to Claude
4. Claude's response streams back, cleaned for natural speech
5. Retell converts the response to speech for the caller

## Quick Start

### Prerequisites

- Node.js 18+
- [Retell AI](https://retellai.com) account
- [Anthropic API](https://console.anthropic.com) key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd clawbotspeaks

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` with your API keys:

```env
RETELL_API_KEY=your_retell_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=8080
```

### Run the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

### Connect to Retell

1. Go to your [Retell Dashboard](https://dashboard.retellai.com)
2. Create or edit an agent
3. Select "Custom LLM" as the LLM type
4. Set the WebSocket URL to `ws://your-server:8080`
5. Assign a phone number to the agent
6. Call the number to test

## Configuration Options

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RETELL_API_KEY` | Yes | - | Your Retell API key |
| `ANTHROPIC_API_KEY` | Yes | - | Your Anthropic API key |
| `PORT` | No | 8080 | WebSocket server port |
| `SYSTEM_PROMPT` | No | See below | Custom system prompt for Claude |

### Default System Prompt

The default prompt instructs Claude to:
- Keep responses brief (1-3 sentences)
- Speak naturally as if on a phone call
- Avoid markdown, URLs, and technical formatting
- Ask clarifying questions when needed

You can override this by setting `SYSTEM_PROMPT` in your `.env` file.

## Project Structure

```
clawbotspeaks/
├── src/
│   ├── index.ts           # Entry point, starts server
│   ├── config.ts          # Environment configuration
│   ├── server.ts          # WebSocket server
│   ├── retell-handler.ts  # Retell protocol implementation
│   ├── llm-client.ts      # Claude API client
│   ├── conversation.ts    # Per-call state management
│   ├── voice-utils.ts     # Text cleaning for TTS
│   └── types.ts           # TypeScript interfaces
├── tests/
│   └── voice-utils.test.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Architecture

### Server (`server.ts`)

The WebSocket server accepts connections from Retell. Each connection represents one phone call. The server:
- Assigns a unique call ID to each connection
- Creates a dedicated handler for the call
- Tracks active calls for monitoring
- Handles graceful shutdown

### Retell Handler (`retell-handler.ts`)

Implements the [Retell WebSocket protocol](https://docs.retellai.com/api-references/llm-websocket). Handles three message types:

- `response_required` - User finished speaking, generate a response
- `reminder_required` - User hasn't spoken, prompt them
- `update_only` - Transcript update, no response needed

Responses are streamed in chunks for lower latency.

### LLM Client (`llm-client.ts`)

Wraps the Anthropic SDK to:
- Stream responses for real-time delivery
- Inject the voice-optimized system prompt
- Handle errors gracefully

### Conversation (`conversation.ts`)

Maintains conversation history per call:
- Syncs state from Retell's transcript
- Formats messages for Claude's API
- Tracks call metadata (start time, message count)

### Voice Utils (`voice-utils.ts`)

Cleans Claude's responses for text-to-speech:
- Removes markdown (bold, italic, code blocks)
- Strips URLs and links
- Removes bullet points and lists
- Truncates long responses at sentence boundaries

## Development

### Scripts

```bash
npm run dev      # Start with hot reload (tsx)
npm run build    # Compile TypeScript
npm start        # Run compiled code
npm test         # Run tests
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Local Development with Retell

For local development, you'll need to expose your server to the internet. Options:

1. **ngrok** (recommended for testing)
   ```bash
   ngrok http 8080
   ```
   Use the provided `wss://` URL in Retell.

2. **Deploy to a cloud provider** (recommended for production)

## Retell Protocol Reference

### Incoming Messages

```typescript
{
  interaction_type: "response_required" | "reminder_required" | "update_only",
  transcript: [
    { role: "user", content: "Hello" },
    { role: "agent", content: "Hi there!" }
  ]
}
```

### Outgoing Messages

```typescript
{
  response_id: 1,
  content: "Hello, how can I help?",
  content_complete: false,  // true on final chunk
  end_call: false           // true to hang up
}
```

## Troubleshooting

### Connection Issues

- Ensure your server is accessible from the internet
- Check that the WebSocket URL uses `ws://` (or `wss://` for TLS)
- Verify your Retell API key is valid

### No Response from Claude

- Check your Anthropic API key is valid
- Look for errors in the server console
- Verify the transcript contains user messages

### Responses Sound Unnatural

- The voice-utils module cleans responses, but Claude may still produce awkward phrasing
- Customize the `SYSTEM_PROMPT` to better guide Claude's responses
- Consider adjusting Retell's voice settings

## License

MIT
