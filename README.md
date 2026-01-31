# ClawBot Speaks

Give your [OpenClaw](https://github.com/openclaw/openclaw) agent a phone number. ClawBot Speaks bridges [Retell AI](https://retellai.com) voice calls to OpenClaw, so callers get full access to your agent's tools, memory, and capabilities—by voice.

```
📞 Phone Call → Retell (STT) → ClawBot Speaks → OpenClaw → Claude + Tools → Back to Retell (TTS) → 📞
```

## Quickstart (15 minutes)

### 1. Prerequisites

- **Node.js 18+**
- **OpenClaw** running with OpenResponses enabled ([setup guide](#enabling-openresponses-in-openclaw))
- **Retell AI account** — [sign up here](https://retellai.com) (has free tier)

### 2. Clone & Install

```bash
git clone https://github.com/altarr/clawbotspeaks.git
cd clawbotspeaks
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
RETELL_API_KEY=your_retell_api_key        # From Retell dashboard
OPENCLAW_URL=http://localhost:18789        # Your OpenClaw gateway URL
OPENCLAW_API_KEY=your_openclaw_api_key     # If auth is enabled (optional)
OPENCLAW_MODEL=anthropic/claude-sonnet-4-20250514
PORT=8080
```

### 4. Expose Your Server (for local dev)

Retell needs to reach your WebSocket server. Use ngrok:

```bash
# In a separate terminal
ngrok http 8080
```

Copy the `https://xxxx.ngrok.io` URL — you'll use the `wss://` version in Retell.

### 5. Start the Server

```bash
npm run dev
```

You should see:
```
Starting ClawBot Speaks voice server...
Voice server started on port 8080
WebSocket endpoint: ws://localhost:8080
Ready to accept Retell connections.
```

### 6. Configure Retell

1. Go to [Retell Dashboard](https://dashboard.retellai.com) → **Agents**
2. Click **Create Agent** (or edit existing)
3. Set **LLM** to **Custom LLM**
4. Set **Custom LLM WebSocket URL** to: `wss://xxxx.ngrok.io` (your ngrok URL)
5. Click **Save**
6. Go to **Phone Numbers** → assign a number to your agent
7. **Call the number** — you're talking to your OpenClaw agent!

---

## Enabling OpenResponses in OpenClaw

ClawBot Speaks uses OpenClaw's `/v1/responses` API. You need to enable it in your OpenClaw config.

### Option A: Edit config.yaml directly

Add to your `~/.openclaw/config.yaml`:

```yaml
gateway:
  http:
    endpoints:
      responses:
        enabled: true
```

Then restart OpenClaw:
```bash
openclaw gateway restart
```

### Option B: Use the CLI

```bash
openclaw config set gateway.http.endpoints.responses.enabled true
openclaw gateway restart
```

### Verify it's working

```bash
curl -X POST http://localhost:18789/v1/responses \
  -H "Content-Type: application/json" \
  -d '{"model":"anthropic/claude-sonnet-4-20250514","input":[{"role":"user","content":"Hello"}],"stream":false}'
```

You should get a JSON response with the assistant's reply.

---

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RETELL_API_KEY` | Yes | - | Your Retell API key (from dashboard) |
| `OPENCLAW_URL` | Yes | - | OpenClaw gateway URL (e.g., `http://localhost:18789`) |
| `OPENCLAW_API_KEY` | No | - | API key if your OpenClaw requires auth |
| `OPENCLAW_MODEL` | No | `anthropic/claude-sonnet-4-20250514` | Model for responses |
| `PORT` | No | `8080` | WebSocket server port |
| `SYSTEM_PROMPT` | No | See below | Custom voice instructions |

### Default System Prompt

```
You are a helpful voice assistant. Keep your responses brief and conversational, 
typically 1-3 sentences. Speak naturally as if on a phone call. Never use markdown, 
URLs, code blocks, or special formatting.
```

Override with `SYSTEM_PROMPT` in your `.env` for custom behavior.

---

## Deployment

### Local Development

Use ngrok (free tier works fine):

```bash
ngrok http 8080
# Use the wss:// URL in Retell
```

### Production (EC2/VPS)

1. Deploy to a server with a public IP
2. Use a reverse proxy (nginx/Caddy) for TLS:

```nginx
# /etc/nginx/sites-available/clawbotspeaks
server {
    listen 443 ssl;
    server_name voice.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

3. Set your Retell Custom LLM URL to `wss://voice.yourdomain.com`

### Docker (coming soon)

```dockerfile
# Dockerfile example - PRs welcome!
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

---

## How It Works

### Architecture

```
┌─────────────┐     WebSocket      ┌─────────────────┐      HTTP/SSE      ┌─────────────┐
│   Retell    │◄──────────────────►│  ClawBot Speaks │◄──────────────────►│   OpenClaw  │
│  (STT/TTS)  │                    │    (bridge)     │                    │  (Claude)   │
└─────────────┘                    └─────────────────┘                    └─────────────┘
      ▲                                                                          │
      │                                                                          │
   Phone                                                                    Tools, Memory,
   Call                                                                     Agent Infra
```

### Request Flow

1. **Caller dials** your Retell phone number
2. **Retell** answers, transcribes speech to text
3. **ClawBot Speaks** receives the transcript via WebSocket
4. **Forwards to OpenClaw** via `/v1/responses` API (streaming)
5. **OpenClaw** processes with Claude, executes any tools
6. **Response streams back** to ClawBot Speaks
7. **Voice utils** clean the response (strip markdown, etc.)
8. **Retell** converts to speech, plays to caller

### Voice Utils

Responses are automatically cleaned for natural TTS:
- Strips markdown (`**bold**` → `bold`)
- Removes URLs and code blocks
- Converts lists to conversational format
- Truncates at sentence boundaries (default 500 chars)

---

## Project Structure

```
clawbotspeaks/
├── src/
│   ├── index.ts           # Entry point
│   ├── config.ts          # Environment configuration
│   ├── server.ts          # WebSocket server
│   ├── retell-handler.ts  # Retell protocol handler
│   ├── llm-client.ts      # OpenClaw API client
│   ├── conversation.ts    # Per-call state
│   ├── voice-utils.ts     # Text cleaning for TTS
│   └── types.ts           # TypeScript interfaces
├── tests/
│   └── voice-utils.test.ts
├── docs/
│   ├── retell-protocol.md # Retell WebSocket protocol details
│   ├── configuration.md   # Full config reference
│   └── deployment.md      # Deployment guides
└── package.json
```

---

## Development

```bash
npm run dev      # Start with hot reload (tsx)
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled code
npm test         # Run tests
```

---

## Why OpenClaw?

Without OpenClaw, each call is a fresh Claude instance:
- ❌ No memory of previous calls
- ❌ No access to tools (calendar, email, etc.)
- ❌ No integration with your systems

With OpenClaw, voice calls get:
- ✅ Full tool access (same as chat/Telegram/etc.)
- ✅ Conversation memory
- ✅ Your agent's personality and instructions
- ✅ Consistent behavior across all channels

---

## Troubleshooting

### "Connection refused" to OpenClaw

- Is OpenClaw running? (`openclaw gateway status`)
- Is OpenResponses enabled? (check config)
- Is the URL correct? (no trailing slash)

### Retell can't connect

- Is ngrok running and URL correct?
- Is the WebSocket server running on the right port?
- Check Retell dashboard for connection errors

### Responses are too long/robotic

- Customize `SYSTEM_PROMPT` to encourage brevity
- The default prompt already does this, but you can tune it

### No audio / silent calls

- Check Retell agent has TTS enabled
- Verify the agent is assigned to the phone number

---

## Contributing

PRs welcome! Some ideas:
- Docker support
- Caller ID handling
- Call recording integration
- Multiple concurrent call support improvements

---

## License

MIT

---

## Links

- [OpenClaw](https://github.com/openclaw/openclaw) — The AI agent framework
- [Retell AI](https://retellai.com) — Voice AI platform
- [OpenClaw Docs](https://docs.openclaw.ai) — Full documentation
