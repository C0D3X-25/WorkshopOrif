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

public class DockerEnvironmentTests : IAsyncLifetime
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
                builder.UseSetting("MongoDB:DatabaseName", "workshoporif_docker_test");
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
    public async Task PostWorkshop_WithDockerEnvironment_GetDetailReturnsDockerEnvironment()
    {
        await AuthenticateAsync();

        var postResponse = await _client!.PostAsJsonAsync("/workshops", new
        {
            title = "Python Tools",
            type = 1,   // Exercise
            level = 0,  // Introduction
            dockerEnvironment = new { image = "python:3.11" }
        });

        postResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await postResponse.Content.ReadFromJsonAsync<Workshop>();

        var getResponse = await _client.GetAsync($"/workshops/{created!.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var workshop = await getResponse.Content.ReadFromJsonAsync<Workshop>();

        workshop!.DockerEnvironment.Should().NotBeNull();
        workshop.DockerEnvironment!.Image.Should().Be("python:3.11");
    }

    // ── Cycle 2: PUT replaces dockerEnvironment ───────────────────────────

    [Fact]
    public async Task PutWorkshop_UpdatesDockerEnvironment()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        var workshop = new Workshop
        {
            Title = "Docker Update Test",
            Type = WorkshopType.Exercise,
            Level = WorkshopLevel.Introduction,
            DockerEnvironment = new DockerEnvironment { Image = "python:3.10" }
        };
        await col.InsertOneAsync(workshop);

        await AuthenticateAsync();
        workshop.DockerEnvironment = new DockerEnvironment { Image = "python:3.12" };

        var putResponse = await _client!.PutAsJsonAsync($"/workshops/{workshop.Id}", workshop);
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var getResponse = await _client.GetAsync($"/workshops/{workshop.Id}");
        var updated = await getResponse.Content.ReadFromJsonAsync<Workshop>();

        updated!.DockerEnvironment!.Image.Should().Be("python:3.12");
    }

    // ── Cycle 3: Import/export round-trip ────────────────────────────────

    [Fact]
    public async Task ImportWorkshop_WithDockerEnvironment_ExportReturnsSameDockerEnvironment()
    {
        await AuthenticateAsync();

        var importPayload = new
        {
            title = "Docker Import Test",
            type = "Exercise",
            level = "Introduction",
            dockerEnvironment = new
            {
                image = "python:3.11",
                devContainer = new
                {
                    extensions = new[] { "ms-python.python" },
                    features = new Dictionary<string, string>(),
                    postCreateCommand = "pip install openai"
                },
                workspaceFiles = new[]
                {
                    new { name = "main.py", content = "print('hello')", gitUrl = (string?)null }
                },
                ports = new[] { new { containerPort = 8000, hostPort = 8000 } },
                env = new Dictionary<string, string> { ["OPENAI_KEY"] = "test" }
            }
        };

        var importResponse = await _client!.PostAsJsonAsync("/admin/workshops/import", importPayload);
        importResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await importResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetString()!;

        var exportResponse = await _client.GetAsync($"/admin/workshops/{id}/export");
        exportResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await exportResponse.Content.ReadFromJsonAsync<WorkshopImportDto>();

        dto!.DockerEnvironment.Should().NotBeNull();
        dto.DockerEnvironment!.Image.Should().Be("python:3.11");
        dto.DockerEnvironment.DevContainer.Extensions.Should().Contain("ms-python.python");
        dto.DockerEnvironment.DevContainer.PostCreateCommand.Should().Be("pip install openai");
        dto.DockerEnvironment.WorkspaceFiles.Should().HaveCount(1);
        dto.DockerEnvironment.WorkspaceFiles[0].Name.Should().Be("main.py");
        dto.DockerEnvironment.Ports.Should().HaveCount(1);
        dto.DockerEnvironment.Ports[0].ContainerPort.Should().Be(8000);
        dto.DockerEnvironment.Env["OPENAI_KEY"].Should().Be("test");
    }

    // ── Cycle 4: null dockerEnvironment — no breakage ────────────────────

    [Fact]
    public async Task GetWorkshop_WithNullDockerEnvironment_ReturnsOkWithNullDockerEnvironment()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        var workshop = new Workshop
        {
            Title = "Theory Without Docker",
            Type = WorkshopType.Theory,
            Level = WorkshopLevel.Introduction
        };
        await col.InsertOneAsync(workshop);

        var response = await _client!.GetAsync($"/workshops/{workshop.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<Workshop>();
        result!.DockerEnvironment.Should().BeNull();
    }

    // ── Cycle 5: list omits dockerEnvironment ────────────────────────────

    [Fact]
    public async Task GetWorkshops_ListResponse_OmitsDockerEnvironmentField()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        await col.InsertOneAsync(new Workshop
        {
            Title = "Exercise With Docker",
            Type = WorkshopType.Exercise,
            Level = WorkshopLevel.Introduction,
            DockerEnvironment = new DockerEnvironment { Image = "python:3.11" }
        });

        var response = await _client!.GetAsync("/workshops?profile=apprentice");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        var item = json!.First(w => w.GetProperty("title").GetString() == "Exercise With Docker");

        item.TryGetProperty("dockerEnvironment", out var envProp).Should().BeFalse();
    }
}
