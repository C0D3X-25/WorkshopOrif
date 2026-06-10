# ADR 0007: Docker Environments for Exercise Workshops

## Status
Accepted

## Context
Exercise Workshops require hands-on coding environments. The Python Tools workshop (creating an OpenAI tool) needs Python, the `openai` SDK, and starter files. Installing these prerequisites on every learner machine is inconsistent and time-consuming.

Key constraints discovered during design:
- The web app (React frontend) cannot directly control Docker — browsers are sandboxed from host OS
- Learners are IT professionals who likely have Docker Desktop installed
- VS Code with Dev Containers is the standard workflow for containerized development
- The app itself runs in Docker, but this doesn't change the browser security model

## Decision
Implement Docker environments for Exercise Workshops using a **Companion App** architecture:

1. **Companion App**: Native tray app (Tauri/Electron) installed by learners
   - Bridges browser → Docker Desktop via localhost HTTP API
   - Handles container lifecycle: pull, start, stop, destroy
   - Auto-starts Docker Desktop if not running
   - Generates persistent anonymous user ID for container identification
   - Launches VS Code with Dev Container connection

2. **dockerEnvironment field**: Optional field on Exercise Workshop documents
   - `image`: Docker image reference (public or private registry)
   - `devcontainer`: Dev Container configuration (features, extensions, post-create commands)
   - `workspaceFiles`: Mixed source — inline small files, git clone for templates
   - `ports` and `env`: Runtime configuration

3. **Container persistence**: Containers identified by `${userId}:${workshopId}`
   - Survives browser refresh
   - Graceful stop (preserved) vs. destroy (cleaned up)
   - Companion app stores user ID in `~/.workshop-orif/id`

4. **IDE integration**: VS Code Dev Containers (local IDE, not web IDE)
   - Companion app launches: `code --folder-uri vscode-remote://dev-container+...`
   - Container exposes Dev Container metadata
   - Learner works in familiar local VS Code environment

## Consequences

### Positive
- Consistent, reproducible environments per workshop
- No prerequisite installation beyond Docker Desktop + Companion App (one-time)
- VS Code Dev Containers is industry standard — learners gain transferable skills
- Containers run locally — no cloud compute costs, works offline
- Graceful degradation: if Docker unavailable, companion app shows clear error

### Negative
- Requires companion app installation (additional onboarding step)
- VS Code and Dev Containers extension are prerequisites
- Container state persistence adds complexity (cleanup concerns)
- Multi-platform companion app builds (Windows, Mac, Linux)

### Neutral
- Workshop authors must provide valid Docker images and Dev Container configs
- Mixed workspace file sources require clear authoring guidelines

## Alternatives Considered

1. **Server-side containers with web IDE (Jupyter, code-server)**
   - Rejected: Cloud compute costs, complexity of multi-tenant container orchestration, requires network

2. **Manual docker commands (copy-paste from UI)**
   - Rejected: Poor UX, friction for learners, inconsistent with modern expectations

3. **Browser extension with native messaging**
   - Rejected: Browser-specific (Chrome/Edge/Firefox differences), less discoverable than standalone app

4. **Docker Desktop Extension**
   - Rejected: Ties us to Docker Desktop specifically; standalone app is more flexible
