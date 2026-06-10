using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using Testcontainers.MongoDb;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api.Tests;

public class ExerciseRuntimeTests : IAsyncLifetime
{
    private readonly MongoDbContainer _mongoContainer = new MongoDbBuilder()
        .WithImage("mongo:8.0")
        .Build();
    private WebApplicationFactory<Program>? _factory;
    private HttpClient? _client;

    private const string AdminPassword = "secret123";
    private const string JwtSecret = "test-jwt-secret-that-is-at-least-32-chars!!";

    private const string MinimalCompose = """
        services:
          workshop:
            image: python:3.11
        """;

    public async Task InitializeAsync()
    {
        await _mongoContainer.StartAsync();

        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("environment", "Testing");
                builder.UseSetting("MongoDB:ConnectionString", _mongoContainer.GetConnectionString());
                builder.UseSetting("MongoDB:DatabaseName", "workshoporif_exercise_runtime_test");
                builder.UseSetting("AdminPassword", AdminPassword);
                builder.UseSetting("Jwt:Secret", JwtSecret);
            });

        _client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null) await _factory.DisposeAsync();
        await _mongoContainer.DisposeAsync();
    }

    private async Task<string> GetAdminTokenAsync()
    {
        var response = await _client!.PostAsJsonAsync("/admin/login", new { password = AdminPassword });
        response.EnsureSuccessStatusCode();
        var cookie = response.Headers.GetValues("Set-Cookie").First();
        var token = cookie.Split(';')[0].Replace("auth=", "");
        return token;
    }

    private async Task AuthenticateAsync()
    {
        var token = await GetAdminTokenAsync();
        _client!.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    // ── Cycle 1: Tracer Bullet ────────────────────────────────────────────

    [Fact]
    public async Task PostWorkshop_WithExerciseRuntime_GetDetailReturnsExerciseRuntime()
    {
        await AuthenticateAsync();

        var postResponse = await _client!.PostAsJsonAsync("/workshops", new
        {
            title = "Python Tools",
            type = 1,   // Exercise
            level = 0,  // Introduction
            exerciseRuntime = new
            {
                compose = MinimalCompose,
                devService = "workshop"
            }
        });

        postResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await postResponse.Content.ReadFromJsonAsync<Workshop>();

        var getResponse = await _client.GetAsync($"/workshops/{created!.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var workshop = await getResponse.Content.ReadFromJsonAsync<Workshop>();

        workshop!.ExerciseRuntime!.DevService.Should().Be("workshop");
        workshop.ExerciseRuntime.Compose.Should().Contain("python:3.11");
    }

    // ── Cycle 2: PUT replaces exerciseRuntime ─────────────────────────────

    [Fact]
    public async Task PutWorkshop_UpdatesExerciseRuntime()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        var workshop = new Workshop
        {
            Title = "Exercise Runtime Update Test",
            Type = WorkshopType.Exercise,
            Level = WorkshopLevel.Introduction,
            ExerciseRuntime = new ExerciseRuntime
            {
                Compose = "services:\n  workshop:\n    image: python:3.10\n",
                DevService = "workshop"
            }
        };
        await col.InsertOneAsync(workshop);

        await AuthenticateAsync();
        workshop.ExerciseRuntime = new ExerciseRuntime
        {
            Compose = "services:\n  workshop:\n    image: python:3.12\n",
            DevService = "workshop"
        };

        var putResponse = await _client!.PutAsJsonAsync($"/workshops/{workshop.Id}", workshop);
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var getResponse = await _client.GetAsync($"/workshops/{workshop.Id}");
        var updated = await getResponse.Content.ReadFromJsonAsync<Workshop>();

        updated!.ExerciseRuntime!.Compose.Should().Contain("python:3.12");
    }

    // ── Cycle 3: Import/export round-trip ────────────────────────────────

    [Fact]
    public async Task ImportWorkshop_WithExerciseRuntime_ExportReturnsSameExerciseRuntime()
    {
        await AuthenticateAsync();

        var importPayload = new
        {
            title = "Exercise Runtime Import Test",
            type = "Exercise",
            level = "Introduction",
            exerciseRuntime = new
            {
                compose = MinimalCompose,
                devService = "workshop",
                workspaceFiles = new[]
                {
                    new { name = "main.py", content = "print('hello')", gitUrl = (string?)null }
                }
            }
        };

        var importResponse = await _client!.PostAsJsonAsync("/admin/workshops/import", importPayload);
        importResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await importResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetString()!;

        var exportResponse = await _client.GetAsync($"/admin/workshops/{id}/export");
        exportResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await exportResponse.Content.ReadFromJsonAsync<WorkshopImportDto>();

        dto!.ExerciseRuntime.Should().NotBeNull();
        dto.ExerciseRuntime!.DevService.Should().Be("workshop");
        dto.ExerciseRuntime.Compose.Should().Contain("python:3.11");
        dto.ExerciseRuntime.WorkspaceFiles.Should().HaveCount(1);
        dto.ExerciseRuntime.WorkspaceFiles[0].Name.Should().Be("main.py");
    }

    // ── Cycle 4: null exerciseRuntime — no breakage ──────────────────────

    [Fact]
    public async Task GetWorkshop_WithNullExerciseRuntime_ReturnsOkWithNullExerciseRuntime()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        var workshop = new Workshop
        {
            Title = "Theory Without Exercise Runtime",
            Type = WorkshopType.Theory,
            Level = WorkshopLevel.Introduction
        };
        await col.InsertOneAsync(workshop);

        var response = await _client!.GetAsync($"/workshops/{workshop.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<Workshop>();
        result!.ExerciseRuntime.Should().BeNull();
    }

    // ── Cycle 5: list omits exerciseRuntime ──────────────────────────────

    [Fact]
    public async Task GetWorkshops_ListResponse_OmitsExerciseRuntimeField()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        await col.InsertOneAsync(new Workshop
        {
            Title = "Exercise With Runtime",
            Type = WorkshopType.Exercise,
            Level = WorkshopLevel.Introduction,
            ExerciseRuntime = new ExerciseRuntime
            {
                Compose = MinimalCompose,
                DevService = "workshop"
            }
        });

        var response = await _client!.GetAsync("/workshops?profile=apprentice");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        var item = json!.First(w => w.GetProperty("title").GetString() == "Exercise With Runtime");

        item.TryGetProperty("exerciseRuntime", out _).Should().BeFalse();
    }

    // ── Cycle 6: compose validation on save ──────────────────────────────

    [Fact]
    public async Task PostWorkshop_WithPrivilegedCompose_ReturnsBadRequest()
    {
        await AuthenticateAsync();

        var postResponse = await _client!.PostAsJsonAsync("/workshops", new
        {
            title = "Unsafe Exercise",
            type = 1,
            level = 0,
            exerciseRuntime = new
            {
                compose = """
                    services:
                      workshop:
                        image: python:3.11
                        privileged: true
                    """,
                devService = "workshop"
            }
        });

        postResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
