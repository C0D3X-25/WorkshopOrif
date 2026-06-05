# Testing Guide

This document covers all testing aspects for the WorkshopOrif application: backend integration tests, test structure, and how to run tests.

---

## Backend Integration Tests

The backend uses **xUnit** with **TestContainers** for integration testing. Tests run against a real MongoDB instance spun up in a Docker container.

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | xUnit | Test runner |
| Assertions | FluentAssertions | Readable assertion syntax |
| Test Server | WebApplicationFactory | In-memory ASP.NET Core server |
| Database | TestContainers.MongoDb | Real MongoDB in Docker for tests |
| Client | HttpClient | Simulates HTTP requests |

### Test Project Structure

```
backend/WorkshopOrif.Api.Tests/
├── WorkshopCrudTests.cs          # CRUD operations (GET, POST, PUT, DELETE)
├── WorkshopsEndpointsTests.cs    # Listing and filtering endpoints
├── AdminAuthTests.cs             # Login and JWT authentication
└── WorkshopImportExportTests.cs  # Import/export JSON functionality
```

---

## Test Approach: Red-Green-Refactor

Tests follow a red-green-refactor TDD cycle where each test validates one complete feature workflow:

### Example: Workshop CRUD Workflow

```csharp
// Cycle 1: GET existing workshop
[Fact]
public async Task GetWorkshopById_ExistingId_Returns200WithWorkshop()
{
    // Arrange: Insert workshop directly to database
    using var scope = _factory!.Services.CreateScope();
    var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
        .GetCollection<Workshop>("workshops");
    
    var workshop = new Workshop { Title = "Test", ... };
    await col.InsertOneAsync(workshop);

    // Act
    var response = await _client!.GetAsync($"/workshops/{workshop.Id}");

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var result = await response.Content.ReadFromJsonAsync<Workshop>();
    result!.Title.Should().Be("Test");
}
```

---

## Test Categories

### 1. CRUD Tests (`WorkshopCrudTests.cs`)

Tests complete lifecycle of a workshop:

| Test | Purpose |
|------|---------|
| `GetWorkshopById_ExistingId_Returns200WithWorkshop` | Fetching existing workshop |
| `GetWorkshopById_NonExistingId_Returns404` | Handling missing resources |
| `PostWorkshop_WithoutJwt_Returns401` | Authentication enforcement |
| `PostWorkshop_WithValidJwt_Returns201WithCreatedWorkshop` | Creating with auth |
| `PutWorkshop_WithValidJwt_Returns200WithUpdatedWorkshop` | Updating existing |
| `DeleteWorkshop_WithValidJwt_Returns204` | Deletion and verification |

### 2. Profile Filtering Tests (`WorkshopsEndpointsTests.cs`)

Tests profile-based visibility:

- **Intern profile** sees only Theory + Introduction workshops
- **Observer profile** sees only Introduction level (any type)
- **Apprentice profile** sees all workshops

### 3. Authentication Tests (`AdminAuthTests.cs`)

Tests JWT flow:

- Valid password returns cookie with `auth` token
- Invalid password returns 401 Unauthorized
- Protected endpoints reject requests without token
- Protected endpoints accept requests with valid Bearer token

### 4. Import/Export Tests (`WorkshopImportExportTests.cs`)

Tests JSON round-trip:

- Import creates workshop from JSON
- Import with `force=true` updates existing
- Import without `force` returns 409 Conflict for duplicates
- Export returns workshop in import-compatible format

---

## Test Infrastructure

### Test Class Setup

Every test class uses `IAsyncLifetime` for async setup/teardown:

```csharp
public class WorkshopCrudTests : IAsyncLifetime
{
    private readonly MongoDbContainer _mongoContainer = new MongoDbBuilder()
        .WithImage("mongo:8.0")
        .Build();
    private WebApplicationFactory<Program>? _factory;
    private HttpClient? _client;

    public async Task InitializeAsync()
    {
        // Start MongoDB container
        await _mongoContainer.StartAsync();

        // Create test factory with container connection
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("environment", "Testing");
                builder.UseSetting("MongoDB:ConnectionString", 
                    _mongoContainer.GetConnectionString());
                builder.UseSetting("MongoDB:DatabaseName", "workshoporif_test");
                builder.UseSetting("AdminPassword", "test-password");
                builder.UseSetting("Jwt:Secret", 
                    "test-jwt-secret-that-is-at-least-32-chars!!");
            });

        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        await _factory!.DisposeAsync();
        await _mongoContainer.DisposeAsync();
    }
}
```

### Authentication Helper

Tests requiring auth use this helper to get a token:

```csharp
private async Task<string> GetAdminTokenAsync()
{
    var response = await _client!.PostAsJsonAsync("/admin/login", 
        new { password = "test-password" });
    response.EnsureSuccessStatusCode();
    
    var cookie = response.Headers.GetValues("Set-Cookie").First();
    var token = cookie.Split(';')[0].Replace("auth=", "");
    return token;
}
```

Usage in tests:

```csharp
var token = await GetAdminTokenAsync();
_client!.DefaultRequestHeaders.Authorization = 
    new AuthenticationHeaderValue("Bearer", token);
```

---

## Running Tests

### Prerequisites

- Docker Desktop (or Docker Engine) — TestContainers needs Docker to run MongoDB
- .NET 10 SDK

### Run All Tests

```bash
cd backend
dotnet test
```

### Run Specific Test Class

```bash
dotnet test --filter "FullyQualifiedName~WorkshopCrudTests"
```

### Run with Detailed Output

```bash
dotnet test --logger "console;verbosity=detailed"
```

### Run in Watch Mode (during development)

```bash
dotnet watch test
```

---

## Test Data Seeding

Tests that need database data insert directly via MongoDB driver:

```csharp
using var scope = _factory!.Services.CreateScope();
var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
    .GetCollection<Workshop>("workshops");

await col.InsertOneAsync(new Workshop { ... });
```

This bypasses the API to set up test state, then uses the API to verify behavior.

---

## Writing New Tests

### Pattern for New Endpoint Tests

```csharp
[Fact]
public async Task EndpointName_Scenario_ExpectedResult()
{
    // Arrange: Set up data and state
    
    // Act: Call the endpoint
    var response = await _client!.GetAsync("/endpoint");
    
    // Assert: Verify response
    response.StatusCode.Should().Be(HttpStatusCode.OK);
}
```

### Naming Convention

```
{Method}_{Scenario}_{ExpectedResult}

Examples:
- GetWorkshopById_ExistingId_Returns200WithWorkshop
- PostWorkshop_WithoutJwt_Returns401
- DeleteWorkshop_WithValidJwt_Returns204
```

### Test Isolation

Each test is isolated:
- Fresh MongoDB container per test class
- Unique database names per test run
- Data inserted per test, not shared

---

## Frontend Testing

Currently minimal frontend testing. To add:

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Create `src/components/Example.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Example from './Example'

describe('Example', () => {
  it('renders', () => {
    render(<Example />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

---

## CI/CD Testing

For automated pipelines (GitHub Actions, Azure DevOps):

```yaml
# Example GitHub Actions step
- name: Test Backend
  run: |
    cd backend
    dotnet test --no-build --verbosity normal
  env:
    DOCKER_HOST: unix:///var/run/docker.sock  # For Linux runners
```

Windows runners work with Docker Desktop's WSL2 backend.

---

## Debugging Tests

### Debug Single Test in VS Code

Add to `.vscode/launch.json`:

```json
{
  "name": "Debug Tests",
  "type": "coreclr",
  "request": "launch",
  "program": "${workspaceFolder}/backend/WorkshopOrif.Api.Tests/bin/Debug/net10.0/WorkshopOrif.Api.Tests.dll",
  "args": ["--filter", "FullyQualifiedName~TestName"],
  "cwd": "${workspaceFolder}/backend"
}
```

### View Test Logs

```bash
dotnet test --logger "trx;LogFileName=test-results.trx"
# Open test-results.trx in Visual Studio or VS Code test explorer
```

---

## Common Issues

### Docker Not Running

**Error:** `Docker is not running`

**Fix:** Start Docker Desktop before running tests.

### Port Conflicts

**Error:** `Address already in use`

**Fix:** TestContainers uses random ports, but if Docker is stuck:
```bash
docker ps -q | xargs docker stop
docker system prune -f
```

### Test Timeout

**Error:** Tests hang during initialization

**Fix:** First run downloads MongoDB image. Wait for completion or pull manually:
```bash
docker pull mongo:8.0
```

---

## Related Documentation

- [Backend Architecture](./backend/backend-architecture.md) — Code being tested
- [API Reference](./api/api-reference.md) — Endpoints under test
- [Docker Deployment](./docker/docker-deployment.md) — Testing in containers
