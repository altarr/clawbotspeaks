# Deployment Guide

This guide covers deploying ClawBot Speaks to various platforms.

## Prerequisites

- Node.js 18+ on the target server
- API keys for Retell and Anthropic
- A domain or public IP for Retell to connect to

## Local Development

### Using ngrok

For testing with Retell locally:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Expose via ngrok
ngrok http 8080
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and configure it in Retell as `wss://abc123.ngrok.io`.

## Production Deployments

### Docker

#### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

#### Build and Run

```bash
# Build the application
npm run build

# Build Docker image
docker build -t clawbotspeaks .

# Run container
docker run -d \
  --name clawbotspeaks \
  -p 8080:8080 \
  -e RETELL_API_KEY=your_key \
  -e ANTHROPIC_API_KEY=your_key \
  clawbotspeaks
```

#### Docker Compose

```yaml
version: '3.8'

services:
  clawbotspeaks:
    build: .
    ports:
      - "8080:8080"
    environment:
      - RETELL_API_KEY=${RETELL_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PORT=8080
    restart: unless-stopped
```

### Railway

1. Connect your GitHub repository to [Railway](https://railway.app)
2. Add environment variables in the Railway dashboard
3. Railway auto-detects Node.js and deploys

The WebSocket URL will be `wss://your-app.railway.app`.

### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your repository
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables
5. Deploy

### Fly.io

#### fly.toml

```toml
app = "clawbotspeaks"
primary_region = "ord"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true

[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]
```

#### Deploy

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch
fly secrets set RETELL_API_KEY=xxx ANTHROPIC_API_KEY=xxx
fly deploy
```

### AWS (EC2 + ALB)

#### EC2 Setup

```bash
# SSH into EC2 instance
ssh ec2-user@your-instance

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Clone and setup
git clone your-repo
cd clawbotspeaks
npm install
npm run build

# Create systemd service
sudo nano /etc/systemd/system/clawbotspeaks.service
```

#### Systemd Service

```ini
[Unit]
Description=ClawBot Speaks Voice Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/clawbotspeaks
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=RETELL_API_KEY=xxx
Environment=ANTHROPIC_API_KEY=xxx

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable clawbotspeaks
sudo systemctl start clawbotspeaks
```

#### Application Load Balancer

1. Create an ALB with WebSocket support
2. Configure target group pointing to your EC2 instance
3. Add HTTPS listener with your SSL certificate
4. Configure health checks

### Google Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/clawbotspeaks

# Deploy
gcloud run deploy clawbotspeaks \
  --image gcr.io/PROJECT_ID/clawbotspeaks \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "RETELL_API_KEY=xxx,ANTHROPIC_API_KEY=xxx"
```

Note: Cloud Run has a WebSocket connection timeout. Consider Cloud Run with WebSocket support or use GCE instead.

## Reverse Proxy Configuration

### Nginx

```nginx
upstream clawbotspeaks {
    server 127.0.0.1:8080;
}

server {
    listen 443 ssl http2;
    server_name voice.example.com;

    ssl_certificate /etc/letsencrypt/live/voice.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voice.example.com/privkey.pem;

    location / {
        proxy_pass http://clawbotspeaks;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

### Caddy

```caddyfile
voice.example.com {
    reverse_proxy localhost:8080
}
```

Caddy automatically handles TLS and WebSocket upgrades.

## Monitoring

### Logging

The server logs to stdout:
- Connection events
- User messages (truncated)
- Response completions
- Errors

For production, pipe logs to a service:

```bash
node dist/index.js | tee -a /var/log/clawbotspeaks.log
```

Or use a logging service like Datadog, Papertrail, or CloudWatch.

### Metrics

Consider adding metrics for:
- Active connections
- Response latency
- Error rates
- Claude API usage

### Health Checks

Add a simple HTTP health endpoint if needed:

```typescript
// In server.ts, add HTTP server alongside WebSocket
import { createServer } from 'http';

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  }
});
```

## Security Considerations

### API Key Security

- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Rotate keys periodically

### Network Security

- Use TLS for all connections
- Restrict inbound traffic to Retell's IP ranges if possible
- Use private networking for internal services

### Rate Limiting

Consider adding rate limiting to prevent abuse:
- Limit connections per IP
- Limit messages per connection
- Monitor for unusual patterns
