# Configuration Guide

This document covers all configuration options for ClawBot Speaks.

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
RETELL_API_KEY=your_retell_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=8080
SYSTEM_PROMPT="Your custom prompt here"
```

### Required Variables

#### `RETELL_API_KEY`

Your Retell AI API key. Get this from the [Retell Dashboard](https://dashboard.retellai.com).

#### `ANTHROPIC_API_KEY`

Your Anthropic API key. Get this from the [Anthropic Console](https://console.anthropic.com).

### Optional Variables

#### `PORT`

The port for the WebSocket server.

- **Default:** `8080`
- **Example:** `PORT=3000`

#### `SYSTEM_PROMPT`

Custom system prompt for Claude. This shapes how Claude responds to callers.

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

#### Information Hotline

```env
SYSTEM_PROMPT="You provide information about city services. Answer questions about trash pickup, parking permits, and city events. Give concise answers. If you don't know something, direct callers to the city website or main phone line."
```

## Claude Model Configuration

The LLM client uses `claude-sonnet-4-20250514` with these settings:

```typescript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 300,
  system: config.systemPrompt,
  messages: conversation
}
```

To modify these settings, edit `src/llm-client.ts`.

### Model Selection

| Model | Use Case |
|-------|----------|
| `claude-sonnet-4-20250514` | Default, good balance of quality and speed |
| `claude-3-5-haiku-20241022` | Faster responses, lower cost |
| `claude-opus-4-20250514` | Highest quality, higher latency |

### Max Tokens

The default `max_tokens: 300` keeps responses concise for voice. Adjust based on your use case:

- **Short responses (greetings, confirmations):** 100-150
- **Standard responses:** 200-300
- **Detailed explanations:** 400-500

## Voice Utils Configuration

The `voice-utils.ts` module has a default max length of 500 characters. Responses longer than this are truncated at a sentence boundary.

To change this, modify `DEFAULT_MAX_LENGTH` in `src/voice-utils.ts`:

```typescript
const DEFAULT_MAX_LENGTH = 500;
```

Or pass a custom length when calling `cleanForTTS`:

```typescript
const cleaned = cleanForTTS(response, 300);
```

## Production Configuration

### Environment-Specific Settings

For production deployments, consider:

```env
# Production .env
RETELL_API_KEY=prod_retell_key
ANTHROPIC_API_KEY=prod_anthropic_key
PORT=8080
NODE_ENV=production
```

### TLS/SSL

For production, use a reverse proxy (nginx, Caddy) to handle TLS:

```
Client (wss://) → Reverse Proxy (TLS termination) → ClawBot (ws://)
```

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name voice.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Health Checks

The server doesn't currently expose a health endpoint. For container deployments, you can check if the process is running or add a simple HTTP health endpoint.

## Troubleshooting Configuration

### "Missing required environment variable"

Ensure your `.env` file exists and contains all required variables. Check for:
- Typos in variable names
- Missing quotes around values with spaces
- File not in the project root

### API Key Issues

Test your API keys independently:

```bash
# Test Anthropic key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Port Conflicts

If port 8080 is in use:

```bash
# Find what's using the port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Use a different port
PORT=3000 npm run dev
```
