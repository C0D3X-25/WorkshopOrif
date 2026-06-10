# ADR 0008: Compose-Only Exercise Runtime

## Status
Accepted — implement now (MVP scope)

## Context
Exercise Workshops need a consistent, author-friendly way to define containerized environments. The MVP uses a structured `dockerEnvironment` object (image, devContainer extensions, ports, env). Workshop authors and the Companion App must handle two mental models if simple and complex workshops diverge. The goal is one structure for every exercise: attach a Compose document to the workshop record and go.

## Decision
Replace the structured `dockerEnvironment` fields with a single **Exercise Runtime** shape:

- `compose`: Docker Compose YAML stored on the Exercise Workshop document in MongoDB
- `workspaceFiles`: starter files (inline or git-sourced), unchanged in purpose
- `devService`: name of the compose service the local IDE attaches to (e.g. `workshop`)

The Companion App generates `.devcontainer/devcontainer.json` at launch from `compose` + `devService`. Authors never maintain a devcontainer file.

No hybrid mode — simple workshops (e.g. one Python image) are just minimal compose files. The structured `dockerEnvironment` field is removed; all exercise workshops use Exercise Runtime from this point.

Exercise Runtime is **embedded on the Workshop document** (`exerciseRuntime` field) — not a separate collection. A dedicated backend module validates compose on workshop save/import. Adding an exercise = one workshop record with chapters + compose YAML + workspace files.

Rejected: separate `exercise_runtimes` collection — two-step authoring, no reuse requirement today.

## Considered Options

1. **Structured fields only (MVP current)** — rejected post-MVP: two authoring paths emerge as workshops grow; multi-service labs don't fit.
2. **Hybrid (structured + optional compose)** — rejected: violates "same structure for all workshops."
3. **Compose-only** — accepted: one author workflow, scales from single-container to multi-service.

## Learner Coding Surface

Local IDE only (VS Code or Cursor + Dev Containers). No browser-based editor in the compose stack. Learners keep the editor they already know; the Companion App attaches it to the running Exercise Runtime.

Rejected: web IDE (code-server, Jupyter in browser) — forces unfamiliar tooling and was already ruled out in ADR 0007 for complexity; the local-IDE constraint is an explicit product choice, not a technical default.

## Launch Automation

Full auto on "Lancer l'exercice": Companion runs `docker compose up`, then opens the local IDE directly into the dev service. The learner never clicks "Reopen in Container." The web UI "ready" state means stack running + IDE attached.

Rejected: semi-auto (open host folder, learner confirms Dev Container) — current MVP behaviour; container may never start. Rejected: files-only — too much friction for workshops.

## Compose Validation

Backend Exercise Runtime service validates compose on author save/import. Trusted authors only — workshop YAML is never learner-supplied. Companion App does not re-validate at launch; it trusts the API payload.

Rejected: Companion-side validation at launch — redundant given trusted-author model and adds duplicated rules to maintain.

## Workspace Persistence

Host bind mount at `~/.workshop-orif/workspaces/<workshopId>/`. Authors reference `.` as the workspace root in compose volumes; the Companion App materialises files there and runs compose from that directory. Edits survive relaunch; Reset deletes the directory and recreates from starter files.

Rejected: container-only files — stronger isolation but no crash recovery and fights Dev Containers conventions. Rejected: per-author volume strategy — inconsistent cleanup and structure.

## Consequences

- ADR 0007's structured `dockerEnvironment` field is superseded for post-MVP authoring; local IDE via Dev Containers from 0007 is reaffirmed.
- Companion App must run `docker compose` lifecycle (up/down) and open the local IDE into the stack — not merely write files and open a host folder.
- Workshop authors need compose literacy; validation layer required before executing YAML on learner machines.
- Immediate migration: convert existing workshops (e.g. `outils-python`) to minimal compose equivalents; remove structured `dockerEnvironment` from API and seed JSON.
- Companion App launch flow refactored in the same pass (compose up + full-auto IDE attach).
