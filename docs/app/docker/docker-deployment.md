# Docker Architecture

The application runs as a multi-container Docker Compose stack with three services: MongoDB, ASP.NET Core API, and React frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Host Machine                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Docker Network                        ││
│  │                                                         ││
│  │  ┌─────────────┐      ┌─────────────┐     ┌─────────┐   ││
│  │  │   Nginx     │─────▶│     API     │────▶│ MongoDB │   ││
│  │  │  (frontend) │      │  (backend)  │     │         │   ││
│  │  │   :80       │      │   :8080     │     │ :27017  │   ││
│  │  └─────────────┘      └─────────────┘     └─────────┘   ││
│  │         │                                              ││
│  │         │ Dev: :5173 (Vite)                             ││
│  └─────────┼───────────────────────────────────────────────┘│
│            │                                                 │
│  Port 80 ──┘ (production)                                   │
│  Port 5173    (development, hot-reload)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Service Dependencies

```
mongo (no deps)
  │
  ▼ healthcheck
api (depends_on: mongo healthy)
  │
  ▼
frontend (depends_on: api)
```

**Startup Order:**

1. **mongo** starts first with healthcheck (pings admin command every 10s)
2. **api** waits for mongo to be healthy, then starts and seeds data
3. **frontend** starts last (depends on api being available)

---

## Services

### MongoDB (`mongo`)

**Image:** `mongo:8.0`

| Aspect | Configuration |
|--------|---------------|
| Data Volume | `mongo_data` (named volume, persistent) |
| Database | `workshoporif` (auto-created) |
| Healthcheck | `mongosh --eval "db.adminCommand('ping')"` |
| Exposed Port | None (internal only) |

**Notes:**
- Data persists across container restarts via named volume
- To expose for external tools (Compass, Studio 3T), add `ports: ["27017:27017"]`

### API (`api`)

**Build Context:** `./backend`
**Dockerfile:** `backend/Dockerfile` (multi-stage)

| Aspect | Configuration |
|--------|---------------|
| Build Stage | `mcr.microsoft.com/dotnet/sdk:10.0` |
| Runtime Stage | `mcr.microsoft.com/dotnet/aspnet:10.0` |
| Exposed Port | `8080` |
| Volume Mount | `./backend/WorkshopOrif.Api/data/workshops:/app/data/workshops:ro` |

**Environment Variables:**

| Variable | Source | Description |
|----------|--------|-------------|
| `MongoDB__ConnectionString` | Hardcoded | `mongodb://mongo:27017` |
| `MongoDB__DatabaseName` | Hardcoded | `workshoporif` |
| `AdminPassword` | `.env` file | Required for admin login |
| `Jwt__Secret` | `.env` file | Required for token signing |

### Frontend (`frontend`)

**Build Context:** `./frontend`
**Dockerfile:** `frontend/Dockerfile` (multi-stage with targets)

**Multi-target Build:**

| Target | Base Image | Port | Purpose |
|--------|------------|------|---------|
| `dev` | `node:24-alpine` | `5173` | Vite dev server with hot-reload |
| `build` | `node:24-alpine` | — | Build static files |
| `prod` | `nginx:1.27-alpine` | `80` | Serve static files + proxy API |

**Build Target Selection:**

```bash
# Production (default)
docker compose up

# Development (hot-reload)
FRONTEND_TARGET=dev docker compose up
```

**Nginx Configuration (Production):**

```nginx
# Proxy API calls
location /api/ {
    proxy_pass http://api:8080/;
}

# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## Volume Mounts

| Volume | Container Path | Host Path | Mode |
|--------|----------------|-----------|------|
| `mongo_data` | `/data/db` | Named volume | Persistent |
| Workshops data | `/app/data/workshops` | `./backend/WorkshopOrif.Api/data/workshops` | Read-only |
| Dev source | `/app` | `./frontend` | Read-write (dev only) |
| Dev node_modules | `/app/node_modules` | Anonymous | Isolated |

---

## Environment Files

### `.env` (Required)

Copy from `.env.example` before first run:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_PASSWORD` | Yes | Admin UI password |
| `JWT_SECRET` | Yes | Min 32 characters |
| `FRONTEND_TARGET` | No | `prod` (default) or `dev` |

**Security Notes:**
- Never commit `.env` to git
- Use strong `JWT_SECRET` in production (32+ random chars)
- Rotate `ADMIN_PASSWORD` regularly

---

## Deployment Modes

### Production Mode (Default)

```bash
docker compose up
```

**Characteristics:**
- Frontend served by Nginx (port 80)
- Static React build (optimized)
- API proxying via Nginx
- No hot-reload
- Suitable for deployment

### Development Mode

```bash
FRONTEND_TARGET=dev docker compose up
```

**Characteristics:**
- Vite dev server (port 5173)
- Hot-reload on file changes
- Source mounted from host
- Slower initial load, faster iterations
- Not suitable for production

---

## Common Commands

### Start Stack

```bash
# Background
docker compose up -d

# Foreground (see logs)
docker compose up

# Rebuild after code changes
docker compose up --build
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
```

### Stop Stack

```bash
# Stop and remove containers
docker compose down

# Stop, remove containers AND volumes (DELETES DATA)
docker compose down -v
```

### Database Operations

```bash
# Access MongoDB shell
docker compose exec mongo mongosh workshoporif

# Reset database (delete all data)
docker compose down -v && docker compose up
```

---

## Troubleshooting

### API Container Won't Start

**Symptom:** `api` container exits immediately

**Check:**
```bash
docker compose logs api
```

**Common Causes:**
- Missing `.env` file
- Invalid `ADMIN_PASSWORD` or `JWT_SECRET`
- MongoDB not healthy (check `docker compose logs mongo`)

### Frontend Shows "502 Bad Gateway"

**Cause:** API not responding

**Fix:**
```bash
# Check API health
docker compose ps

# Restart API
docker compose restart api
```

### Changes Not Reflecting (Dev Mode)

**Check:** Ensure `FRONTEND_TARGET=dev` is set

```bash
# Verify
docker compose exec frontend env | grep TARGET

# Recreate with dev target
docker compose down
docker compose up --build
```

### Port Already in Use

**Error:** `bind: address already in use`

**Fix:** Kill process using port 80 or 5173:
```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 80).OwningProcess
Stop-Process -Id <PID>
```

---

## Production Deployment

### Single Server

1. Clone repository on server
2. Configure `.env` with production values
3. Run `docker compose up -d`
4. Configure reverse proxy (if needed) to port 80

### Behind Reverse Proxy

If running behind Nginx/Traefik/Apache:

1. Remove port `80:80` from `docker-compose.yml`
2. Use internal Docker network
3. Configure upstream proxy to `http://frontend:80`

### SSL/TLS

Add SSL at reverse proxy level or use:

```yaml
# docker-compose.override.yml for production
services:
  frontend:
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
```

---

## Related Documentation

- [Backend Architecture](../backend/backend-architecture.md) — API service details
- [Frontend Architecture](../frontend/frontend-architecture.md) — Frontend build process
- [API Reference](../api/api-reference.md) — Endpoints served by the API container
- [Testing Guide](../testing.md) — Testing in Docker environment
