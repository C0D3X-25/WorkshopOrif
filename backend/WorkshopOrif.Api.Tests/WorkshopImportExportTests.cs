using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.MongoDb;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api.Tests;

public class WorkshopImportExportTests : IAsyncLifetime
{
    private readonly MongoDbContainer _mongoContainer = new MongoDbBuilder()
        .WithImage("mongo:8.0")
        .Build();
    private WebApplicationFactory<Program>? _factory;
    private HttpClient? _client;

    private const string AdminPassword = "secret123";
    private const string JwtSecret = "test-jwt-secret-that-is-at-least-32-chars!!";

    public async Task InitializeAsync()
    {
        await _mongoContainer.StartAsync();

        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("environment", "Testing");
                builder.UseSetting("MongoDB:ConnectionString", _mongoContainer.GetConnectionString());
                builder.UseSetting("MongoDB:DatabaseName", "workshoporif_import_test");
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

    private async Task AuthenticateAsync()
    {
        var response = await _client!.PostAsJsonAsync("/admin/login", new { password = AdminPassword });
        response.EnsureSuccessStatusCode();
        var cookie = response.Headers.GetValues("Set-Cookie").First();
        var token = cookie.Split(';')[0].Replace("auth=", "");
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    private static object MakeDto(string title, int chapterCount = 1) => new
    {
        title,
        type = "Theory",
        level = "Introduction",
        chapters = Enumerable.Range(1, chapterCount).Select(i => new
        {
            section = "Théorie",
            title = $"Chapitre {i}",
            body = $"Contenu du chapitre {i}.",
            questions = Array.Empty<object>()
        }).ToArray()
    };

    // ── Cycle 1: import creates a new workshop ────────────────────────────

    [Fact]
    public async Task ImportWorkshop_NewTitle_Returns201AndWorkshopIsAccessible()
    {
        await AuthenticateAsync();

        var response = await _client!.PostAsJsonAsync("/admin/workshops/import", MakeDto("Test Import"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        var getResponse = await _client.GetAsync(response.Headers.Location!.OriginalString);
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Cycle 2: import returns 409 when title already exists ─────────────

    [Fact]
    public async Task ImportWorkshop_ExistingTitle_Returns409WithConflictInfo()
    {
        await AuthenticateAsync();
        await _client!.PostAsJsonAsync("/admin/workshops/import", MakeDto("Conflict Workshop", chapterCount: 2));

        var response = await _client.PostAsJsonAsync("/admin/workshops/import", MakeDto("Conflict Workshop", chapterCount: 1));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("existingId").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("chapterCount").GetInt32().Should().Be(2);
    }

    // ── Cycle 3: import with force=true replaces existing ─────────────────

    [Fact]
    public async Task ImportWorkshop_ExistingTitleWithForce_Returns200AndReplacesContent()
    {
        await AuthenticateAsync();
        var first = await _client!.PostAsJsonAsync("/admin/workshops/import", MakeDto("Force Replace", chapterCount: 1));
        var firstBody = await first.Content.ReadFromJsonAsync<JsonElement>();
        var id = firstBody.GetProperty("id").GetString()!;

        var response = await _client.PostAsJsonAsync(
            "/admin/workshops/import?force=true",
            MakeDto("Force Replace", chapterCount: 3));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var workshop = await _client.GetFromJsonAsync<Workshop>($"/workshops/{id}");
        workshop!.Chapters.Length.Should().Be(3);
    }

    // ── Cycle 4: export returns import-compatible JSON ────────────────────

    [Fact]
    public async Task ExportWorkshop_ExistingId_Returns200WithImportCompatibleJson()
    {
        await AuthenticateAsync();
        var created = await _client!.PostAsJsonAsync("/admin/workshops/import", MakeDto("Export Me", chapterCount: 2));
        var createdBody = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = createdBody.GetProperty("id").GetString()!;

        var response = await _client.GetAsync($"/admin/workshops/{id}/export");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<WorkshopImportDto>();
        dto!.Title.Should().Be("Export Me");
        dto.Chapters.Length.Should().Be(2);
    }
}
