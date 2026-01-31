# Deployment Guide

This guide covers deploying ClawBot Speaks to various environments.

## Prerequisites

- Node.js 18+ on the target server
- OpenClaw gateway running with OpenResponses enabled
- Retell AI account with API key
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

**Important:** The free ngrok tier generates a new URL each time. For persistent development, consider ngrok's paid tier or deploy to a cloud provider.

## Production Deployments

### Simple VPS (Recommended for starters)

The simplest production setup is a basic VPS (DigitalOcean, Linode, Vultr, etc.):

```bash
# SSH into your server
ssh user@your-server

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone https://github.com/altarr/clawbotspeaks.git
cd clawbotspeaks
npm install
npm run build

# Create .env
cp .env.example .env
nano .env  # Add your keys

# Test it works
npm start

# Set up as a service (see systemd section below)
```

### AWS EC2

#### 1. Launch EC2 Instance

- AMI: Amazon Linux 2023 or Ubuntu 22.04
- Instance type: t3.micro (sufficient for moderate call volume)
- Security group: Allow inbound TCP 8080 (or 443 if using TLS)

#### 2. Install & Configure

```bash
# SSH in
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git

# Clone and build
git clone https://github.com/altarr/clawbotspeaks.git
cd clawbotspeaks
npm install
npm run build

# Create .env with your config
cp .env.example .env
nano .env
```

#### 3. Create systemd Service

```bash
sudo nano /etc/systemd/system/clawbotspeaks.service
```

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
EnvironmentFile=/home/ec2-user/clawbotspeaks/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable clawbotspeaks
sudo systemctl start clawbotspeaks
sudo systemctl status clawbotspeaks
```

#### 4. Configure Retell

Set your Custom LLM WebSocket URL to `ws://your-ec2-ip:8080`

For production with TLS, add nginx (see Reverse Proxy section below).

### Docker

#### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built code
COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

#### Build and Run

```bash
# Build the application first
npm run build

# Build Docker image
docker build -t clawbotspeaks .

# Run container
docker run -d \
  --name clawbotspeaks \
  -p 8080:8080 \
  --env-file .env \
  --restart unless-stopped \
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
    env_file:
      - .env
    restart: unless-stopped
```

### Railway

1. Connect your GitHub repository to [Railway](https://railway.app)
2. Add environment variables in the Railway dashboard:
   - `RETELL_API_KEY`
   - `OPENCLAW_URL`
   - `OPENCLAW_API_KEY` (if needed)
   - `OPENCLAW_MODEL`
3. Railway auto-detects Node.js and deploys

WebSocket URL: `wss://your-app.up.railway.app`

### Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your repository
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables
5. Deploy

WebSocket URL: `wss://your-app.onrender.com`

### Fly.io

#### fly.toml

```toml
app = "clawbotspeaks"
primary_region = "iad"  # Choose closest to your users

[build]
  [build.args]
    NODE_VERSION = "20"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.ports]]
    handlers = ["http"]
    port = 80
```

#### Deploy

```bash
fly launch
fly secrets set RETELL_API_KEY=xxx OPENCLAW_URL=xxx OPENCLAW_API_KEY=xxx
fly deploy
```

WebSocket URL: `wss://clawbotspeaks.fly.dev`

## Reverse Proxy (TLS)

For production, use a reverse proxy to handle TLS termination.

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

        # WebSocket timeouts (24 hours)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}

server {
    listen 80;
    server_name voice.example.com;
    return 301 https://$server_name$request_uri;
}
```

Get a free certificate with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d voice.example.com
```

### Caddy (Simpler)

Caddy auto-handles TLS certificates:

```caddyfile
voice.example.com {
    reverse_proxy localhost:8080
}
```

```bash
sudo caddy run --config Caddyfile
```

## Connecting to OpenClaw

### Same Machine

If OpenClaw runs on the same server:
```env
OPENCLAW_URL=http://localhost:18789
```

### Different Machine (Local Network)

```env
OPENCLAW_URL=http://192.168.1.100:18789
```

### Different Machine (Internet) — Use Tailscale (Recommended)

[Tailscale](https://tailscale.com) creates a private mesh network between your machines. It's the best way to connect a cloud-deployed ClawBot Speaks to an OpenClaw running elsewhere (e.g., your home server or laptop).

**Why Tailscale?**
- ✅ No port forwarding or firewall holes
- ✅ Encrypted end-to-end (WireGuard)
- ✅ OpenClaw stays private (not exposed to internet)
- ✅ Works through NAT, firewalls, anywhere
- ✅ Free for personal use (up to 100 devices)

**Setup:**

1. Install Tailscale on your **OpenClaw machine**:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   tailscale up
   ```
   Note the Tailscale IP (looks like `100.x.x.x`)

2. Install Tailscale on your **ClawBot Speaks server** (EC2, VPS, etc.):
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   tailscale up
   ```

3. Configure ClawBot Speaks to use the Tailscale IP:
   ```env
   OPENCLAW_URL=http://100.x.x.x:18789
   ```

4. Test connectivity:
   ```bash
   curl http://100.x.x.x:18789/v1/responses \
     -H "Content-Type: application/json" \
     -d '{"model":"anthropic/claude-sonnet-4-20250514","input":[{"role":"user","content":"ping"}],"stream":false}'
   ```

**That's it.** Your cloud voice server can now reach your private OpenClaw over an encrypted tunnel, with zero public exposure.

### Alternative: Public Exposure (Not Recommended)

If you must expose OpenClaw publicly:
```env
OPENCLAW_URL=https://openclaw.yourdomain.com
OPENCLAW_API_KEY=your-api-key  # Enable auth!
```

⚠️ Make sure OpenClaw has API authentication enabled if exposed to the internet.

## Monitoring & Logs

### View Logs

```bash
# If using systemd
sudo journalctl -u clawbotspeaks -f

# If running directly
npm start 2>&1 | tee clawbotspeaks.log

# Docker
docker logs -f clawbotspeaks
```

### What to Monitor

- **Active connections** - logged on connect/disconnect
- **Response latency** - slow responses = poor call experience
- **Errors** - OpenClaw connection issues, API errors
- **OpenClaw health** - if OpenClaw is down, calls fail

## Security Checklist

- [ ] Never commit `.env` files to git
- [ ] Use TLS in production (nginx/Caddy)
- [ ] Restrict server access (firewall, security groups)
- [ ] Use environment variables or secrets manager for keys
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Consider rate limiting for abuse prevention

## Scaling

For high call volume:

1. **Vertical scaling** - Bigger instance (usually sufficient)
2. **Horizontal scaling** - Multiple instances behind a load balancer
   - WebSocket connections are stateful; use sticky sessions or session affinity
3. **OpenClaw scaling** - Ensure your OpenClaw can handle the request volume

For most use cases, a single t3.small/medium handles dozens of concurrent calls.
