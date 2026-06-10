# Backend Architecture

The backend is an ASP.NET Core 10 Web API providing REST endpoints for workshop management.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | ASP.NET Core 10 |
| Database | MongoDB 8 (via Docker) |
| Driver | MongoDB C# Driver |
| Auth | JWT Bearer tokens (HS256) |
| Testing | xUnit + TestContainers |

---

## Project Structure

```
backend/
├── WorkshopOrif.Api/              # Main API project
│   ├── Controllers/
│   │   ├── WorkshopsController.cs   # Public CRUD + listing
│   │   └── AdminController.cs       # Auth + import/export
│   ├── Models/
│   │   ├── Workshop.cs              # Domain entities (incl. ExerciseRuntime)
│   │   └── WorkshopImportDto.cs     # Import/export DTO
│   ├── Services/
│   │   └── ExerciseRuntimeValidator.cs  # Compose validation on save/import
│   ├── DataSeeder.cs                # Startup data seeding
│   └── Program.cs                   # App configuration
├── WorkshopOrif.Api.Tests/        # Integration tests
│   ├── WorkshopsEndpointsTests.cs
│   ├── AdminAuthTests.cs
│   ├── WorkshopImportExportTests.cs
│   └── ExerciseRuntimeTests.cs    # Exercise Runtime CRUD + validation
└── Dockerfile                       # Multi-stage build
```

---

## Architecture Overview

### Request Flow

```
HTTP Request
    ↓
Nginx (frontend container) — proxies /api/*
    ↓
WorkshopsController / AdminController
    ↓
MongoDB Driver → MongoDB Container
```

### Key Design Decisions

1. **Controller-based API** — Uses traditional controllers rather than minimal APIs for clarity and testability
2. **Profile-based filtering** — All filtering happens in the controller, not the database layer
3. **Import/Export DTO** — Separate DTO for JSON serialization to handle enum-as-string and date formatting
4. **Data seeding** — Automatic seeding from JSON files in `/app/data/workshops` at startup

---

## Controllers

### WorkshopsController

**Route prefix:** `/workshops`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/workshops` | No | List workshops (with optional profile filter) |
| GET | `/workshops/{id}` | No | Get single workshop |
| POST | `/workshops` | Yes | Create new workshop |
| PUT | `/workshops/{id}` | Yes | Update workshop |
| DELETE | `/workshops/{id}` | Yes | Delete workshop |

**Profile Filtering:**

The `GetWorkshops()` method applies profile-based filtering using MongoDB query builders:

```csharp
var filter = profile.ToLowerInvariant() switch
{
    "intern" => Builders<Workshop>.Filter.And(
        Builders<Workshop>.Filter.Eq(w => w.Type, WorkshopType.Theory),
        Builders<Workshop>.Filter.Eq(w => w.Level, WorkshopLevel.Introduction)),

    "observer" => Builders<Workshop>.Filter.Eq(w => w.Level, WorkshopLevel.Introduction),

    _ => Builders<Workshop>.Filter.Empty,
};
```

### AdminController

**Route prefix:** `/admin`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/admin/login` | No | Authenticate and receive JWT cookie |
| POST | `/admin/workshops/import` | Yes | Import workshop from JSON |
| GET | `/admin/workshops/{id}/export` | Yes | Export workshop to JSON |

**Import/Export:**

- Uses `WorkshopImportDto` for JSON serialization
- Handles enum conversion (string ↔ int)
- Supports `force` parameter for updates
- Detects duplicates by title

---

## Models

### Workshop (Domain Entity)

Located in [`Models/Workshop.cs`](../../../backend/WorkshopOrif.Api/Models/Workshop.cs)

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string?` | MongoDB ObjectId (auto-generated) |
| `Title` | `string` | Unique identifier for duplicates |
| `Type` | `WorkshopType` | Enum: Theory(0), Exercise(1) |
| `Level` | `WorkshopLevel` | Enum: Introduction(0), Advanced(1) |
| `Chapters` | `Chapter[]` | Ordered content sections |

### Chapter

| Field | Type | Notes |
|-------|------|-------|
| `Section` | `string` | Grouping label (e.g., "Théorie") |
| `Body` | `string` | Markdown fallback content |
| `Blocks` | `ContentBlock[]` | Structured content (preferred) |
| `Questions` | `Question[]` | Quiz for this chapter |

### ContentBlock Variants

| Type | Fields | Purpose |
|------|--------|---------|
| `content` | `elements: ContentElement[]` | Structured rich text |
| `markdown` | `content: string` | Legacy markdown |
| `table` | `headers[], rows[][]` | Data tables |

### WorkshopImportDto

Located in [`Models/WorkshopImportDto.cs`](../../../backend/WorkshopOrif.Api/Models/WorkshopImportDto.cs)

Transforms between:
- **String enums** (`"Theory"`, `"Introduction"`) in JSON
- **Integer enums** in MongoDB documents
- **ISO date strings** (`"2026-06-01"`) in JSON
- **DateTime** in documents

---

## Configuration

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MongoDB__ConnectionString` | Yes | MongoDB connection string |
| `MongoDB__DatabaseName` | Yes | Database name |
| `AdminPassword` | Yes | Password for admin login |
| `Jwt__Secret` | Yes | HS256 signing key (min 32 chars) |

### JWT Configuration

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
        };
        // Cookie fallback configured in OnMessageReceived event
    });
```

---

## Data Seeding

The [`DataSeeder`](../../../backend/WorkshopOrif.Api/DataSeeder.cs) runs at startup if the collection is empty:

1. Reads all `.json` files from `/app/data/workshops`
2. Deserializes as `WorkshopImportDto`
3. Converts to `Workshop` entities
4. Inserts or updates (by title match) in MongoDB

**For development:** Mount your local `backend/WorkshopOrif.Api/data/workshops` folder into the container to live-edit workshop content.

**Re-import after schema changes:** If MongoDB already contains workshops with an old shape (e.g. `dockerEnvironment`), re-import seed JSON with `POST /admin/workshops/import?force=true` or drop the `workshops` collection and restart the API to re-seed from files.

---

## Exercise Runtime

Exercise workshops may include an embedded **Exercise Runtime** (`exerciseRuntime` on the workshop document):

| Field | Type | Description |
|-------|------|-------------|
| `Compose` | string | Docker Compose YAML |
| `DevService` | string | Compose service name for IDE attach |
| `WorkspaceFiles` | array | Starter files for the learner workspace |

[`ExerciseRuntimeValidator`](../../../backend/WorkshopOrif.Api/Services/ExerciseRuntimeValidator.cs) runs on POST/PUT/import when `exerciseRuntime` is present. It rejects dangerous compose (privileged mode, host network, `docker.sock` mounts, non-relative volume paths).

List endpoints **omit** `exerciseRuntime` from the response (projection exclude) to keep payloads small; detail and export include the full object.

See [Companion App Architecture](../companion/companion-architecture.md) for how learners consume this at Launch.

---

## Testing

Integration tests use TestContainers to spin up a real MongoDB instance:

```bash
cd backend
dotnet test
```

**Test categories:**
- **CRUD operations** — Workshop creation, reading, updating, deletion
- **Auth flow** — Login, token validation, protected endpoints
- **Import/Export** — JSON round-trip, duplicate detection
- **Exercise Runtime** — CRUD, compose validation, list projection

---

## Development

### Run Locally (requires .NET 10 SDK + MongoDB)

```bash
cd backend/WorkshopOrif.Api
dotnet run
```

The API will be available at `http://localhost:8080`.

### Docker Build

```bash
docker build -t workshop-api ./backend
```

Multi-stage Dockerfile:
1. `build` stage — SDK image restores and publishes
2. `runtime` stage — Runtime image runs the DLL

---

## Related Documentation

- [API Reference](../api/api-reference.md) — Endpoint details
- [Companion App Architecture](../companion/companion-architecture.md) — Launch and compose lifecycle
- [Docker Deployment](../docker/docker-deployment.md) — Container orchestration
- [Testing Guide](../testing.md) — Running and writing tests
- [Workshop JSON Reference](../../how-to/json-reference.md) — Import schema
