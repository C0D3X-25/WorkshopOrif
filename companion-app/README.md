# Workshop ORIF — Companion App

A lightweight Electron tray app that bridges the Workshop ORIF browser interface to Docker Desktop on the learner's machine.

## What it does

- Exposes a local HTTP API on **`http://127.0.0.1:37428`**
- When the learner clicks **Lancer l'exercice** in the web app, the browser calls this API
- The Companion App pulls the Docker image, writes workspace starter files, generates a `.devcontainer/devcontainer.json`, then opens VS Code
- VS Code detects the Dev Container configuration and prompts the learner to reopen in container

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js ≥ 20 | Required to build and run the Companion App locally |
| npm | Bundled with Node.js |
| Docker Desktop | Must be installed; the app will start it automatically if stopped |
| VS Code | With the **Dev Containers** extension (`ms-vscode-remote.remote-containers`) |

## Build from source

`node_modules/` is **not** committed to the repository (see root `.gitignore`). After cloning or pulling, install dependencies before running or building the app.

```bash
cd companion-app

# Install dependencies (prefer npm ci when package-lock.json is present)
npm ci

# Compile TypeScript to dist/
npm run build

# Run the tray app (build + Electron)
npm start
```

Other useful commands:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Same as `npm start` — build then launch Electron |
| `npm run typecheck` | Type-check app and test sources without emitting files |
| `npm test` | Run unit tests |

The app starts in the system tray (look for the blue icon near the clock on Windows, or the menu bar on macOS). Right-click to see status and quit.

> **Deployment note:** The main Workshop ORIF stack (`docker compose up` at the repo root) does not include this app. Learners and facilitators install and run the Companion App separately on their machine using the steps above.

## HTTP API

### `GET /health`

Returns the current status of the Companion App and Docker.

```json
{
  "status": "ok",
  "docker": "running",
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "version": "0.1.0"
}
```

### `POST /containers/launch`

Starts the exercise environment for a workshop. Returns a **Server-Sent Events** stream.

**Request body:**
```json
{
  "workshopId": "507f1f77bcf86cd799439011",
  "image": "python:3.11-slim",
  "devContainer": {
    "extensions": ["ms-python.python"],
    "postCreateCommand": "pip install openai"
  },
  "workspaceFiles": [
    { "name": "main.py", "content": "# starter code\n" }
  ],
  "ports": [],
  "env": {}
}
```

**SSE events** (`data: <JSON>\n\n`):

| `phase`      | Meaning |
|--------------|---------|
| `pulling`    | Docker image is being pulled |
| `starting`   | Workspace files written, VS Code launching |
| `ready`      | VS Code opened — learner can start coding |
| `error`      | Something went wrong; `message` field contains the French error text |

### `POST /containers/reset`

Closes VS Code or Cursor if it is running the workshop workspace, removes the local workshop directory, and stops any associated Dev Container so the learner can start fresh.

**Request body:**
```json
{
  "workshopId": "507f1f77bcf86cd799439011"
}
```

**Response:** `{ "ok": true, "editorClosed": true }` on success (`editorClosed` is `false` if no matching editor window was found), or `{ "error": "..." }` with HTTP 4xx/5xx.

## Workspace files

Each workshop gets an isolated directory at:

```
~/.workshop-orif/workspaces/<workshopId>/
├── .devcontainer/
│   └── devcontainer.json   (always regenerated from workshop definition)
├── main.py                  (only written on first launch — preserved on relaunch)
└── ...
```

The anonymous user ID is stored at `~/.workshop-orif/id`.

## Building a distributable (future)

```bash
npm install --save-dev electron-builder
npx electron-builder --win --mac --linux
```

This is not part of the MVP — the app is run from source during the workshop.
