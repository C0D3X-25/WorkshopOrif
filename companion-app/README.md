# Workshop ORIF — Companion App

A lightweight Electron tray app that bridges the Workshop ORIF browser interface to Docker Desktop on the learner's machine.

**Full documentation:** [docs/app/companion/companion-architecture.md](../docs/app/companion/companion-architecture.md)

## What it does

- Exposes a local HTTP API on **`http://127.0.0.1:37428`**
- When the learner clicks **Lancer l'exercice**, the browser calls this API (via `/companion/*` proxy)
- The Companion writes `compose.yml` and starter files, runs **`docker compose up -d`**, generates `.devcontainer/devcontainer.json`, then opens VS Code or Cursor **directly into the dev service** (no manual "Reopen in Container")

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js ≥ 20 | Required to build and run the Companion App locally |
| npm | Bundled with Node.js |
| Docker Desktop | Must be installed; the app will start it automatically if stopped |
| VS Code or Cursor | With the **Dev Containers** extension |

## Build from source

`node_modules/` is **not** committed to the repository (see root `.gitignore`). After cloning or pulling, install dependencies before running or building the app.

```bash
cd companion-app

npm ci
npm run build
npm start
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Same as `npm start` — build then launch Electron |
| `npm run typecheck` | Type-check app and test sources |
| `npm test` | Run unit tests |

The app starts in the system tray. Right-click to see status and quit.

> **Deployment note:** The main Workshop ORIF stack (`docker compose up` at the repo root) does not include this app. Learners install and run the Companion separately on their machine.

## HTTP API (summary)

See [companion-architecture.md](../docs/app/companion/companion-architecture.md) for the full contract.

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness probe |
| `GET /containers/:workshopId/status` | Whether workspace exists |
| `POST /containers/launch` | Materialise runtime, compose up, open IDE (SSE) |
| `POST /containers/reset` | Compose down, delete workspace |

**Launch request body:**

```json
{
  "workshopId": "507f1f77bcf86cd799439011",
  "compose": "services:\n  workshop:\n    image: python:3.11-slim\n    volumes:\n      - .:/workspace\n    working_dir: /workspace\n    command: sleep infinity\n",
  "devService": "workshop",
  "workspaceFiles": [{ "name": "main.py", "content": "# starter\n" }]
}
```

**SSE phases:** `starting` → `pulling` (compose output) → `ready` | `error`

## Workspace layout

```
~/.workshop-orif/workspaces/<workshopId>/
├── compose.yml
├── .devcontainer/devcontainer.json   (generated at launch)
└── main.py                           (starter files — preserved on relaunch)
```

Anonymous user ID: `~/.workshop-orif/id`

## Building a distributable (future)

```bash
npm install --save-dev electron-builder
npx electron-builder --win --mac --linux
```

Not part of the MVP — the app is run from source during workshops.
