# WorkshopOrif

A web app with a **React (Vite + TypeScript)** frontend and a **C# ASP.NET Core** backend API, backed by MongoDB and deployed via Docker. It teaches people working in IT what AI is, through theory workshops, exercise workshops, and an awareness track. Content is gated by profile.

## Language

**Profile**:
A learner profile that determines which workshops are accessible. Each user is assigned one profile. Three profiles exist: Intern, Observer, and Apprentice.
_Avoid_: Persona, role, user type

**Intern**:
Profile for a half-day stage. Covers introduction-level theory workshops only. Goal: understand that AI is now part of IT jobs. Display label in French UI: **Stage**.
_Avoid_: Stagiaire, Internship

**Observer**:
Profile for a 3-day observation. Covers introduction theory workshops and a small set of simple exercise workshops. Display label in French UI: **Observation**.
_Avoid_: Visiteur

**Apprentice**:
Profile for CFC and pre-apprenticeship students. Covers the full course — all theory workshops (including advanced) and all exercise workshops. Display label in French UI: **CFC**.
_Avoid_: Learner, Student

**Profile Picker**:
A landing screen shown on first visit where the user self-selects their profile. Selection is persisted in localStorage. Can be changed at any time from a settings control.
_Avoid_: Login, onboarding, registration

**Workshop**:
A single unit of learning — either a theory page or a practical exercise. Belongs to one track, has one level, and targets one or more profiles. Users navigate freely between available workshops with no enforced order. Each workshop carries: title, description, date, authors, prerequisites, max concurrent participants, required materials, estimated duration, and expected outcome. Workshop content body is stored as Markdown per locale (`contentFr`, `contentEn`) in MongoDB and rendered on the frontend. MVP ships with French content only.
_Avoid_: Module, lesson, chapter, page

**Level**:
A field on a workshop indicating its depth: `introduction` or `advanced`. Applies to both Theory and Exercise workshops. Default access matrix:
- Intern: Theory introduction only
- Observer: Theory introduction + Exercise introduction
- Apprentice: all workshops (both levels, both types)

Individual workshops may restrict access further based on complexity. Example: a Theory/Introduction workshop on tools is restricted to Observer+ because the concept is judged too abstract for a half-day Intern stage.
_Avoid_: Difficulty, tier, grade

**Track**:
A named grouping of workshops sharing a theme. Current tracks: Formation (skill-building) and Sensibilisation (awareness/ethics).
_Avoid_: Section, category, course

**Theory Workshop**:
A workshop that presents concepts and may include questions at the end. Questions are self-assessment only — the user answers, then sees the correct answer with an explanation. No score is stored.
_Avoid_: Theory module, lecture, reading

**Exercise Workshop**:
A workshop that presents a hands-on task for the learner to complete. May optionally include an **Exercise Runtime** for containerized development.
_Avoid_: Exercise module, lab, practical

**Exercise Runtime**:
The containerized environment specification attached to an Exercise Workshop. Stored embedded on the same workshop document (`exerciseRuntime`): a Docker Compose document (`compose`), starter workspace files (`workspaceFiles`), and the name of the service the IDE attaches to (`devService`). One self-contained record per exercise — authors add a workshop JSON with its compose YAML inside. The Companion App generates `devcontainer.json` at launch; authors never write it.
_Avoid_: dockerEnvironment, container config, lab setup, runtime environment

**Dev Service**:
The compose service the learner's IDE connects to for editing and running code. Named by `devService` on the Exercise Runtime (e.g. `workshop`). Other services in the same compose stack (databases, queues) run alongside but are not the Coding Surface.
_Avoid_: Main service, app service, workspace service

**Compose Validation**:
Checks applied to Exercise Runtime compose documents when trusted authors save or import a workshop. Rejects dangerous directives (privileged mode, host network, unsafe volume mounts). Validation runs in the backend Exercise Runtime service only — the Companion App trusts compose received from the API. Authors are trusted; learners are not expected to supply compose.
_Avoid_: Sandbox, lint, security scan

**Coding Surface**:
Where the learner writes and runs exercise code. Always the learner's own local IDE (VS Code or Cursor) attached to the Exercise Runtime via Dev Containers — never a browser-based editor bundled in the workshop. The learner keeps tools and shortcuts they already know.
_Avoid_: Web IDE, online editor, in-browser coding, code-server

**dockerEnvironment**:
Deprecated field name on workshop documents. Replaced by **Exercise Runtime** (`exerciseRuntime` in storage). Do not add new structured fields (image, devContainer, ports, env).
_Avoid_: Container config, Docker setup

**Companion App**:
A lightweight native application (Tauri/Electron) installed by learners alongside Docker Desktop. Bridges the browser (where the Workshop web app runs) to the local Docker Desktop installation. On launch: materialises the Exercise Runtime, runs the compose stack, and opens the learner's local IDE already attached to the dev service — no manual "Reopen in Container" step. Tears the stack down on reset. Communicates with the browser over localhost HTTP. Stores a persistent anonymous user ID for stack identification.
_Avoid_: Desktop app, native client, Docker helper

**Launch**:
The Companion App action triggered when a learner clicks "Lancer l'exercice." Succeeds only when the compose stack is running and the Coding Surface is connected to the dev service. A failed or partial launch (files written but container not running) is not a successful Launch.
_Avoid_: Start, open, deploy

**Workspace**:
The learner's working copy of an Exercise Runtime on their machine, at `~/.workshop-orif/workspaces/<workshopId>/`. Starter files are written here on first launch; edits persist across relaunches. The dev service bind-mounts this directory. Reset deletes the folder and recreates from starter files.
_Avoid_: Project folder, lab directory, exercise files

**Reset**:
The learner action that tears down a workshop environment and starts fresh. Stops the compose stack, removes containers, deletes the Workspace on disk, and relaunches from starter files on the next Launch.
_Avoid_: Restart, reload, recommencer (UI label only)

**Question**:
A self-assessment item embedded in a Theory Workshop. Fields: chapterTitle (groups the question under its chapter heading in the UI), text, type (single-choice or multiple-choice), options (each with text and isCorrect), and explanation shown after answering. Stored as an embedded array in the workshop document. Rendered as a grouped interactive self-assessment section after the workshop content body.
_Avoid_: Quiz, test, exercise

**Admin UI**:
A protected route inside the app where authorized authors create and edit workshops directly in MongoDB. Not visible to learners. Accessible at `/admin`.
_Avoid_: CMS, back-office, dashboard

**Locale**:
A supported UI language. The app UI uses `react-i18next` with `fr` and `en` locale files. Workshop content has per-locale Markdown fields. MVP ships French only; English content can be added without schema changes.
_Avoid_: Language, translation
