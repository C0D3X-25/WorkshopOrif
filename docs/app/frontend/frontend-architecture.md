# Frontend Architecture

The frontend is a React 19 SPA built with Vite, TypeScript, and React Router.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19 (with StrictMode) |
| Language | TypeScript |
| Build Tool | Vite 6 |
| Router | React Router 7 |
| Markdown | react-markdown |
| Styling | CSS Modules (component-level CSS) |

---

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx              # Entry point (creates React root)
│   ├── App.tsx               # Root component with route definitions
│   ├── index.css             # Global styles
│   ├── pages/                # Route-level components
│   │   ├── ProfilePicker.tsx # Profile selection screen
│   │   ├── WorkshopList.tsx  # Workshop listing
│   │   ├── WorkshopDetail.tsx # Workshop content view
│   │   └── *.css             # Page-specific styles
│   └── components/           # Shared/reusable components
│       ├── ChapterContent.tsx   # Renders chapter body/blocks
│       ├── StructuredContent.tsx # Renders structured elements
│       ├── ContentTable.tsx     # Renders table blocks
│       ├── QuestionCard.tsx     # Quiz question UI
│       └── DockerLaunchButton.tsx # Exercise Runtime launch UI
├── public/                   # Static assets
├── index.html                # HTML template
├── nginx.conf                # Production server config
├── Dockerfile                # Multi-stage build (dev + prod)
└── package.json
```

---

## Routing Architecture

Defined in [`App.tsx`](../../../frontend/src/App.tsx):

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `ProfilePicker` or redirect | Landing page (redirects if profile selected) |
| `/profile` | `ProfilePicker` | Allow profile re-selection |
| `/workshops` | `WorkshopList` | Browse available workshops |
| `/workshops/:id` | `WorkshopDetail` | View workshop content |

### Profile Gate

The app stores the selected profile in `localStorage`:

```typescript
const hasProfile = Boolean(localStorage.getItem('profile'))
// Redirects to /workshops if profile exists
```

**Profile values:** `intern`, `observer`, `apprentice`

---

## Component Hierarchy

### Page Components

#### ProfilePicker

**Location:** [`pages/ProfilePicker.tsx`](../../../frontend/src/pages/ProfilePicker.tsx)

- Displays three profile cards
- Stores selection in `localStorage`
- Navigates to `/workshops` on selection

**Profile Definitions:**

| Key | Label | Description |
|-----|-------|-------------|
| `intern` | Stage | Demi-journée · Sensibilisation IA |
| `observer` | Observation | 3 jours · Théorie + exercices guidés |
| `apprentice` | CFC | Parcours complet · Tous les ateliers |

#### WorkshopList

**Location:** [`pages/WorkshopList.tsx`](../../../frontend/src/pages/WorkshopList.tsx)

- Fetches `/api/workshops?profile=<profile>`
- Displays workshops as cards with type/level badges
- Links to detail pages

**Badge Colors:**

| Type | Class | Color |
|------|-------|-------|
| Theory | `.type-theory` | Blue |
| Exercise | `.type-exercise` | Green |
| Introduction | `.level-introduction` | Light |
| Advanced | `.level-advanced` | Dark |

#### WorkshopDetail

**Location:** [`pages/WorkshopDetail.tsx`](../../../frontend/src/pages/WorkshopDetail.tsx)

- Fetches `/api/workshops/{id}`
- Displays full workshop with:
  - Header (title, description, badges)
  - Summary table (authors, duration, etc.)
  - Prerequisites list
  - Materials list
  - Chapters (with section headers)
  - Questions
  - **Exercise Runtime launch** (when `exerciseRuntime` is present)
  - Expected outcome

**Print Support:** Includes a "Print / Export PDF" button and `no-print` CSS classes for interactive elements.

#### DockerLaunchButton

**Location:** [`components/DockerLaunchButton.tsx`](../../../frontend/src/components/DockerLaunchButton.tsx)

Renders the **Lancer l'exercice** flow for workshops with an `exerciseRuntime`:

1. Probes `GET /companion/health` (proxied to the learner's Companion App on port 37428)
2. Streams `POST /companion/containers/launch` (SSE) with `compose`, `devService`, and `workspaceFiles` from the workshop
3. Shows restart confirmation dialog → `POST /companion/containers/reset`

The Companion runs `docker compose up` and opens VS Code/Cursor directly into the dev service — see [Companion App Architecture](../companion/companion-architecture.md).

### Shared Components

#### ChapterContent

**Location:** [`components/ChapterContent.tsx`](../../../frontend/src/components/ChapterContent.tsx)

Renders chapter content supporting two modes:

| Mode | Data | Renderer |
|------|------|----------|
| Legacy | `body: string` | `react-markdown` |
| Structured | `blocks: ContentBlock[]` | Component switcher |

**Block Types:**

```typescript
type ContentBlock =
  | { type: 'markdown'; content: string }
  | { type: 'content'; elements: ContentElement[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
```

#### StructuredContent

**Location:** [`components/StructuredContent.tsx`](../../../frontend/src/components/StructuredContent.tsx)

Renders rich content elements:

| Element Type | Renders As |
|--------------|------------|
| `heading` | `<h2>` or `<h3>` |
| `paragraph` | `<p>` with inline formatting |
| `blockquote` | `<blockquote>` |
| `list` | `<ul>` or `<ol>` |
| `code` | `<pre><code>` |

#### QuestionCard

**Location:** [`components/QuestionCard.tsx`](../../../frontend/src/components/QuestionCard.tsx)

Displays quiz questions with:

- Single choice (radio buttons)
- Multiple choice (checkboxes)
- Correct/incorrect feedback after answering
- Explanation reveal

---

## State Management

The app uses **no external state library**. State is managed via:

1. **localStorage** — Persistent profile selection
2. **React useState/useEffect** — Component-level data fetching
3. **URL parameters** — Workshop ID via `useParams()`

### Data Fetching Pattern

```typescript
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetch(`/api/workshops/${id}`)
    .then(r => { if (!r.ok) throw new Error(...); return r.json() })
    .then(setData)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false))
}, [id])
```

---

## Build Configuration

### Vite Config

Development server proxies `/api/*` to the backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_PROXY_TARGET || 'http://api:8080',
      changeOrigin: true,
    }
  }
}
```

### Environment Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_API_PROXY_TARGET` | `vite.config.ts` | Backend API URL for dev proxy |

---

## Development Workflow

### Quick Start (Docker)

```bash
# Dev mode with hot-reload
FRONTEND_TARGET=dev docker compose up
# Access at http://localhost:5173
```

### Local Development

```bash
cd frontend
npm install
npm run dev
```

### Production Build

```bash
npm run build
# Output in dist/ folder
```

---

## Styling Architecture

| Scope | Location | Purpose |
|-------|----------|---------|
| Global | `index.css` | Base styles, CSS variables, print styles |
| Page | `pages/*.css` | Page-specific layouts |
| Component | Component CSS | Scoped component styles |

### Print Styles

The detail page supports printing to PDF:

```css
@media print {
  .no-print { display: none; }
  /* Navigation, buttons hidden */
}
```

---

## Type Safety

All API responses are typed. Key interfaces:

```typescript
interface Workshop {
  id: string
  title: string
  type: number  // 0=Theory, 1=Exercise
  level: number // 0=Introduction, 1=Advanced
  chapters: Chapter[]
}

interface Chapter {
  section: string
  title: string
  body: string
  blocks?: ContentBlock[]
  questions: Question[]
}
```

**Note:** Enums arrive as integers from the API, requiring lookup tables for display labels.

---

## Testing

Integration tests are in the backend and companion projects. Frontend e2e uses Playwright with a mocked Companion API — see [Testing Guide](../testing.md).

---

## Related Documentation

- [API Reference](../api/api-reference.md) — Backend endpoints consumed by these components
- [Companion App Architecture](../companion/companion-architecture.md) — Launch flow behind DockerLaunchButton
- [Docker Deployment](../docker/docker-deployment.md) — Frontend container and `/companion` proxy
- [Testing Guide](../testing.md) — Playwright e2e specs
- [Workshop JSON Reference](../../how-to/json-reference.md) — Data structure rendered by these components
