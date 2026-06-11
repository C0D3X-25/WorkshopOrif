# WorkshopOrif

A web app that teaches IT professionals what AI is, through theory workshops, exercise workshops, and an awareness track. Content is gated by learner profile (Intern, Observer, Apprentice).

**Stack:** React (Vite + TypeScript) · ASP.NET Core 10 · MongoDB 8 · Docker Compose · Companion App (Electron)

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Runs the web stack and exercise containers |
| [Node.js ≥ 20](https://nodejs.org/) | Required only to run the Companion App |
| VS Code or Cursor with the **Dev Containers** extension | Required only on learner machines for exercise workshops |

---

## Running the app

### 1. Clone and configure

```sh
git clone https://github.com/C0D3X-25/WorkshopOrif.git
cd WorkshopOrif

cp .env.example .env
# Open .env and set ADMIN_PASSWORD and JWT_SECRET
```

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Password for the Admin UI (`/admin`) |
| `JWT_SECRET` | HS256 signing secret for auth cookies — minimum 32 characters |

### 2. Start the stack

```sh
docker compose up
```

Wait for the `api` container to log `Now listening on: http://[::]:8080`, then open the app:

- **http://localhost/** — production build (Nginx)
- **http://localhost:5173/** — dev mode only (see below)

### 3. Start the Companion App (for exercise workshops)

Exercise workshops launch a local dev container and open VS Code/Cursor automatically. Each machine that runs exercises needs the Companion App running alongside Docker Desktop.

```sh
cd companion-app
npm ci          # first time only
npm start
```

The app starts in the **system tray**. It exposes a local HTTP API on `http://127.0.0.1:37428` that the browser calls when a learner clicks **Lancer l'exercice**.

> See [companion-app/README.md](companion-app/README.md) and [docs/app/companion/companion-architecture.md](docs/app/companion/companion-architecture.md) for full details.

---

## Ports

| Port | Service | Description |
|------|---------|-------------|
| `80` | `frontend` | React SPA served by Nginx (production) |
| `5173` | `frontend` | Vite dev server (dev mode only) |
| `8080` | `api` | ASP.NET Core REST API |
| `27017` | `mongo` | MongoDB — not exposed to the host by default |
| `37428` | Companion App | Local HTTP API on the learner's machine (not in Docker) |

> To expose MongoDB to the host (e.g. for Compass), add `ports: ["27017:27017"]` under the `mongo` service in `docker-compose.yml`.

---

## Containers

| Container | Image | Role |
|-----------|-------|------|
| `mongo` | `mongo:8.0` | Persistent document store. Data is kept in the `mongo_data` named volume. Other services wait for its health-check before starting. |
| `api` | built from `./backend` | ASP.NET Core REST API. Reads MongoDB connection details and secrets from environment variables. Seeds workshop data from `./backend/WorkshopOrif.Api/data/workshops/` on startup. |
| `frontend` | built from `./frontend` | **Production** (default): static React build served by Nginx, proxying `/api/*` to `api` and `/companion/*` to the Companion App on the host. **Dev**: Vite dev server with hot-reload. |

---

## Development mode (hot-reload)

```sh
FRONTEND_TARGET=dev docker compose up
```

Source files in `frontend/` are mounted into the container — changes are reflected without rebuilding.

The API can also be run directly (requires .NET 10 SDK and a local MongoDB):

```sh
cd backend/WorkshopOrif.Api
dotnet run
```

---

## Workshop data

Workshop JSON files live in `backend/WorkshopOrif.Api/data/workshops/`. They are bind-mounted into the `api` container and seeded into MongoDB on startup — editing a JSON file and restarting the `api` container picks up the change without rebuilding the image.

See [docs/how-to/json-reference.md](docs/how-to/json-reference.md) and [docs/how-to/workshop-creation-guide.md](docs/how-to/workshop-creation-guide.md) for authoring details.

---

## Running the tests

**Backend** integration tests (requires Docker for TestContainers):

```sh
cd backend
dotnet test
```

**Companion App** unit tests (no Docker required):

```sh
cd companion-app
npm test
```

**Frontend** e2e tests (Playwright, mocks the Companion — first run: `npx playwright install chromium`):

```sh
cd frontend
npx playwright test
```

See [docs/app/testing.md](docs/app/testing.md) for the full test matrix.

---

## Project structure

```
WorkshopOrif/
├── backend/               # ASP.NET Core API + integration tests
│   └── WorkshopOrif.Api/
│       └── data/workshops/  # Workshop JSON files (seeded at startup)
├── companion-app/         # Electron tray app — bridges browser to Docker
│   └── src/               # TypeScript sources
├── frontend/              # React + Vite SPA
├── docs/                  # Architecture docs, ADRs, how-to guides
├── docker-compose.yml     # mongo + api + frontend
├── .env.example           # Copy to .env and fill in secrets
└── CONTEXT.md             # Domain vocabulary and project glossary
```
