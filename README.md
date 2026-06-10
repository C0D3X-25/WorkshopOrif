# WorkshopOrif

A web app that teaches IT professionals what AI is, through theory workshops, exercise workshops, and an awareness track. Content is gated by learner profile (Intern, Observer, Apprentice).

**Stack:** React (Vite + TypeScript) · ASP.NET Core 10 · MongoDB 8 · Docker Compose · Companion App (Electron)

Exercise workshops with a containerised environment also require the **[Companion App](companion-app/README.md)** on each learner machine — see [docs/app/companion/companion-architecture.md](docs/app/companion/companion-architecture.md).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)

No other runtime is required — .NET and Node are only needed if you want to run services outside of Docker.

---

## Quick start

```sh
# 1. Clone
git clone https://github.com/C0D3X-25/WorkshopOrif.git
cd WorkshopOrif

# 2. Configure secrets
cp .env.example .env
#    Open .env and set ADMIN_PASSWORD and JWT_SECRET

# 3. Start the full stack
docker compose up
```

The app is ready when the `api` container logs `Now listening on: http://[::]:8080`.

Open the app at **http://localhost/** (or http://localhost:5173/ in dev mode).

---

## Ports

| Port | Service | Description |
|------|---------|-------------|
| `80` | `frontend` | React SPA served by Nginx (production build) |
| `8080` | `api` | ASP.NET Core Web API |
| `27017` | `mongo` | MongoDB — **not** exposed to the host by default |

> To also expose MongoDB to the host (e.g. for inspection with Compass), add `ports: ["27017:27017"]` under the `mongo` service in `docker-compose.yml`.

---

## Containers

| Container | Image | Role |
|-----------|-------|------|
| `mongo` | `mongo:8.0` | Persistent document store. Data is kept in the `mongo_data` named volume. Starts with a health-check; other services wait for it to be healthy before starting. |
| `api` | built from `./backend` | ASP.NET Core controller-based REST API. Reads MongoDB connection details and secrets from environment variables. |
| `frontend` | built from `./frontend` | In **production** mode (default): static React build served by Nginx, which also proxies `/api/*` requests to the `api` container. In **dev** mode: Vite dev server with hot-reload. |

---

## Development mode (hot-reload)

```sh
FRONTEND_TARGET=dev docker compose up
```

The Vite dev server is available at `http://localhost:5173`. Source files in `frontend/` are mounted into the container so changes are reflected without rebuilding.

The API can also be run directly (requires .NET 10 SDK and a local MongoDB):

```sh
cd backend/WorkshopOrif.Api
dotnet run
```

---

## Environment variables

Copy `.env.example` to `.env` before starting. The following variables are **required**:

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Password for the Admin UI (`POST /admin/login`) |
| `JWT_SECRET` | HS256 signing secret for auth cookies — minimum 32 characters |

Optional:

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_TARGET` | `prod` | Set to `dev` to use the Vite dev server instead of Nginx |

---

## Running the tests

Backend integration tests (requires Docker for TestContainers):

```sh
cd backend
dotnet test
```

Companion App unit tests:

```sh
cd companion-app
npm test
```

Frontend e2e (Playwright, mocks Companion — first run: `npx playwright install chromium`):

```sh
cd frontend
npx playwright test
```

See [docs/app/testing.md](docs/app/testing.md) for details.