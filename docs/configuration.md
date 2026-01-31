# Configuration Guide

This document covers all configuration options for ClawBot Speaks.

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
RETELL_API_KEY=your_retell_api_key
OPENCLAW_URL=http://localhost:3000
OPENCLAW_API_KEY=optional_api_key
PORT=8080
SYSTEM_PROMPT="Your custom prompt here"
```

### Required Variables

#### `RETELL_API_KEY`

Your Retell AI API key. Get this from the [Retell Dashboard](https://dashboard.retellai.com).

#### `OPENCLAW_URL`

The URL of your OpenClaw gateway. This must have OpenResponses enabled:

```json
{
  "gateway": {
    "openResponses": {
      "enabled": true
    }
  }
}
```

Examples:
- Local: `http://localhost:3000`
- Production: `https://openclaw.yourdomain.com`

### Optional Variables

#### `OPENCLAW_API_KEY`

API key for authenticating with OpenClaw, if required by your configuration.

#### `OPENCLAW_MODEL`

The model to use for generating responses.

- **Default:** `anthropic/claude-sonnet-4-20250514`
- **Example:** `OPENCLAW_MODEL=anthropic/claude-opus-4-5`

#### `PORT`

The port for the WebSocket server.

- **Default:** `8080`
- **Example:** `PORT=3000`

#### `SYSTEM_PROMPT`

Custom instructions passed to OpenClaw's OpenResponses API. This shapes how the assistant responds to callers.

**Default prompt:**
```
You are a helpful voice assistant. Keep your responses brief and conversational, typically 1-3 sentences.

Important guidelines for voice interactions:
- Speak naturally as if on a phone call
- Never use markdown, URLs, code blocks, or special formatting
- Don't use bullet points or numbered lists
- Avoid technical jargon unless the user uses it first
- If you need to list items, say them conversationally (e.g., "You could try A, B, or C")
- Ask clarifying questions if the request is unclear
- Be warm and personable while staying professional
```

## OpenClaw Configuration

### Enabling OpenResponses

In your OpenClaw configuration:

```json
{
  "gateway": {
    "openResponses": {
      "enabled": true
    }
  }
}
```

### OpenResponses API

ClawBot Speaks calls `POST /v1/responses` with:

```json
{
  "input": [
    { "role": "user", "content": "message" },
    { "role": "assistant", "content": "response" }
  ],
  "instructions": "system prompt here",
  "stream": true
}
```

The `instructions` field receives the `SYSTEM_PROMPT` from ClawBot Speaks.

## Custom System Prompts

### Writing Effective Voice Prompts

Voice interactions have different constraints than text:

1. **Keep it brief** - Long responses lose the caller's attention
2. **Sound natural** - Write as if speaking, not writing
3. **No formatting** - Markdown, bullets, and URLs don't translate to speech
4. **Be conversational** - Use contractions, casual language

### Examples

#### Customer Service Bot

```env
SYSTEM_PROMPT="You are a friendly customer service representative for Acme Corp. Help callers with orders, returns, and product questions. Keep responses under 3 sentences. If you need to transfer to a human, say so clearly. Always confirm understanding before taking action."
```

#### Appointment Scheduler

```env
SYSTEM_PROMPT="You are an appointment scheduler for Dr. Smith's dental office. Help callers book, reschedule, or cancel appointments. Ask for their name and preferred date/time. Confirm all details before ending the call. Available hours are Monday through Friday, 9 AM to 5 PM."
```

#### Personal Assistant

```env
SYSTEM_PROMPT="You are the user's personal assistant with access to their calendar, email, and tasks. Keep responses brief and action-oriented. When asked to do something, confirm what you're doing. If you need clarification, ask one question at a time."
```

## Voice Utils Configuration

The `voice-utils.ts` module has a default max length of 500 characters. Responses longer than this are truncated at a sentence boundary.

To change this, modify `DEFAULT_MAX_LENGTH` in `src/voice-utils.ts`:

```typescript
const DEFAULT_MAX_LENGTH = 500;
```

## Production Configuration

### Environment-Specific Settings

For production deployments:

```env
# Production .env
RETELL_API_KEY=prod_retell_key
OPENCLAW_URL=https://openclaw.internal.yourdomain.com
OPENCLAW_API_KEY=prod_openclaw_key
PORT=8080
NODE_ENV=production
```

### TLS/SSL

For production, use a reverse proxy (nginx, Caddy) to handle TLS:

```
Client (wss://) → Reverse Proxy (TLS termination) → ClawBot (ws://)
```

### Network Security

- ClawBot Speaks should be able to reach your OpenClaw gateway
- Retell should be able to reach ClawBot Speaks
- Consider using internal networking between ClawBot and OpenClaw

## Troubleshooting

### "Missing required environment variable"

Ensure your `.env` file exists and contains all required variables.

### OpenClaw Connection Issues

Test the connection:
```bash
curl -X POST http://localhost:3000/v1/responses \
  -H "Content-Type: application/json" \
  -d '{"input":[{"role":"user","content":"Hello"}],"stream":false}'
```

If this fails, check:
- OpenClaw is running
- OpenResponses is enabled in OpenClaw config
- URL is correct (no trailing slash)

### Port Conflicts

If port 8080 is in use:
```bash
# Use a different port
PORT=3001 npm run dev
```
