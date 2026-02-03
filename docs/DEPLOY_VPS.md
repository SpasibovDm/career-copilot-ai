# Deploy Career Copilot AI to a VPS

This guide provisions Docker + Docker Compose on a Linux VPS, then runs the production stack with Caddy, FastAPI, and Next.js.

## 1) Install Docker + Compose

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 2) Clone repo + configure env

```bash
git clone <YOUR_REPO_URL> career-copilot-ai
cd career-copilot-ai

cp .env.production.example .env.production
```

Edit `.env.production` with your real values:

- `DOMAIN` (the primary domain for the app)
- `POSTGRES_PASSWORD` and `SECRET_KEY`
- `CORS_ALLOW_ORIGINS` (typically `https://$DOMAIN`)
- `PUBLIC_BASE_URL` / `NEXT_PUBLIC_API_URL` (typically `https://api.$DOMAIN`)
- Set `USE_LOCAL_STORAGE=false` and configure MinIO values **or** set `USE_LOCAL_STORAGE=true` and skip MinIO.

## 3) Configure DNS

Point these records at your VPS IP:

- `A` record for `${DOMAIN}`
- `A` record for `api.${DOMAIN}`

Caddy will provision HTTPS certificates automatically.

## 4) Start the production stack

```bash
cd infra

# If you want MinIO (recommended for production uploads)

docker compose -f docker-compose.prod.yml --profile minio up -d --build

# If you want local storage instead of MinIO, set USE_LOCAL_STORAGE=true in .env.production
# and start without the minio profile:
# docker compose -f docker-compose.prod.yml up -d --build
```

## 5) Verify health

```bash
curl -fsS https://api.${DOMAIN}/health
```

If you see `"status": "ok"`, the API is ready.

## 6) Updates

```bash
cd ~/career-copilot-ai

git pull
cd infra

docker compose -f docker-compose.prod.yml up -d --build
```
