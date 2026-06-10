# API Reference

This document describes all REST API endpoints for the WorkshopOrif application.

## Base URL

| Environment | Base URL |
|-------------|----------|
| Docker (production) | `http://localhost/api/` (via Nginx proxy) |
| Docker (dev) | `http://localhost:5173/api/` (Vite dev server) |
| Local .NET | `http://localhost:8080/` |

---

## Authentication

The API uses JWT bearer tokens. Tokens are obtained via the admin login endpoint and can be provided either:

- **As a cookie**: `auth=<token>` (preferred for browser clients)
- **In header**: `Authorization: Bearer <token>`

All admin operations require authentication.

### POST /admin/login

Authenticate as administrator to receive a JWT token.

**Request:**
```json
{
  "password": "your-admin-password"
}
```

**Response:**
- `200 OK` — Sets `auth` cookie, returns empty body
- `400 Bad Request` — Missing password
- `401 Unauthorized` — Invalid password

**Note:** The password is configured via the `ADMIN_PASSWORD` environment variable.

---

## Public Endpoints (No Auth Required)

These endpoints are used by the frontend for browsing workshops.

### GET /workshops

List all workshops, optionally filtered by learner profile.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profile` | string | no | Filter by profile: `intern`, `observer`, `apprentice` |

**Profile Filtering Logic:**

| Profile | Visible Workshops |
|---------|-------------------|
| `intern` | Theory + Introduction level only |
| `observer` | Introduction level only (both Theory and Exercise) |
| `apprentice` (default) | All workshops |

**Response:** `200 OK`
```json
[
  {
    "id": "...",
    "title": "Introduction à l'IA",
    "description": "Découvrir les fondements...",
    "type": "Theory",
    "level": "Introduction"
  }
]
```

### GET /workshops/{id}

Get a single workshop with full details including all chapters and questions.

**Response:** `200 OK`
```json
{
  "id": "...",
  "title": "Introduction à l'IA",
  "description": "...",
  "type": 0,
  "level": 0,
  "track": "Sensibilisation",
  "authors": ["Alice Martin"],
  "prerequisites": [],
  "maxConcurrentParticipants": 20,
  "requiredMaterials": ["Ordinateur"],
  "estimatedDuration": 90,
  "expectedOutcome": "Être capable d'expliquer...",
  "date": "2026-09-01T00:00:00Z",
  "chapters": [
    {
      "section": "Théorie",
      "title": "Chapitre 1 — Définition",
      "body": "L'IA est...",
      "blocks": [...],
      "questions": [...]
    }
  ]
}
```

**Note:** `type` and `level` are returned as integers (0=Theory/Introduction, 1=Exercise/Advanced).

---

## Admin Endpoints (Auth Required)

These endpoints require a valid JWT token (via cookie or header).

### POST /workshops

Create a new workshop.

**Request Body:** Workshop object (same schema as GET response, without `id`)

**Response:** `201 Created` with `Location` header pointing to the new resource

### PUT /workshops/{id}

Update an existing workshop.

**Request Body:** Complete workshop object

**Response:** `200 OK` with updated workshop, or `404 Not Found`

### DELETE /workshops/{id}

Delete a workshop.

**Response:** `204 No Content`, or `404 Not Found`

### POST /admin/workshops/import

Import a workshop from JSON. This is the primary way to create workshops from files.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `force` | boolean | `false` | Overwrite existing workshop with same title |

**Request Body:** JSON matching [WorkshopImportDto](../../../backend/WorkshopOrif.Api/Models/WorkshopImportDto.cs)

**Response Scenarios:**

- `201 Created` — New workshop created
- `200 OK` — Existing workshop updated (when `force=true`)
- `409 Conflict` — Workshop exists and `force=false`
  ```json
  {
    "message": "Un atelier avec le titre \"...\" existe déjà.",
    "existingId": "...",
    "title": "...",
    "chapterCount": 3,
    "questionCount": 5
  }
  ```

**Key Differences from Workshop Model:**

| Field | Import DTO | Workshop Model |
|-------|------------|----------------|
| `type` | string ("Theory"/"Exercise") | enum (integer) |
| `level` | string ("Introduction"/"Advanced") | enum (integer) |
| `date` | string ("YYYY-MM-DD") | DateTime |
| `id` | Not allowed (auto-generated) | Required |

### GET /admin/workshops/{id}/export

Export a workshop as JSON.

**Response:** Workshop in import format (strings for enums, ISO date format)

---

## Data Models

### WorkshopType (enum)

| Value | Name |
|-------|------|
| 0 | `Theory` |
| 1 | `Exercise` |

### WorkshopLevel (enum)

| Value | Name |
|-------|------|
| 0 | `Introduction` |
| 1 | `Advanced` |

### Chapter

| Field | Type | Description |
|-------|------|-------------|
| `section` | string | Section label (e.g., "Théorie", "Exercice") |
| `title` | string | Chapter heading |
| `body` | string | Markdown content (fallback) |
| `blocks` | ContentBlock[] | Structured content (preferred) |
| `questions` | Question[] | Quiz questions |

### ContentBlock

```json
{
  "type": "content",    // or "markdown", "table"
  "elements": [...],    // for "content" type
  "content": "...",     // for "markdown" type (legacy)
  "headers": [...],     // for "table" type
  "rows": [...]         // for "table" type
}
```

See [Chapter Content System](../../frontend/src/components/ChapterContent.tsx) for rendering logic.

---

## Error Responses

All errors follow standard HTTP status codes:

| Status | Meaning |
|--------|---------|
| 400 | Bad Request — Invalid JSON or missing required fields |
| 401 | Unauthorized — Missing or invalid JWT |
| 404 | Not Found — Workshop ID doesn't exist |
| 409 | Conflict — Import collision (title exists) |

---

## Related Documentation

- [Workshop JSON Format](../../workshop-json-format.md) — Complete schema for import/export
- [Backend Architecture](../backend/backend-architecture.md) — Controllers and models
- [Frontend Architecture](../frontend/frontend-architecture.md) — How the UI consumes these endpoints
