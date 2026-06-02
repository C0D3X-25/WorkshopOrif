using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using Testcontainers.MongoDb;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api.Tests;

public class WorkshopCrudTests : IAsyncLifetime
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
                builder.UseSetting("MongoDB:DatabaseName", "workshoporif_crud_test");
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
        // Extract token value from "auth=<token>; ..."
        var token = cookie.Split(';')[0].Replace("auth=", "");
        return token;
    }

    // ── Cycle 1: GET /workshops/{id} ──────────────────────────────────────

    [Fact]
    public async Task GetWorkshopById_ExistingId_Returns200WithWorkshop()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        var workshop = new Workshop
        {
            Title = "Intro to AI",
            Type = WorkshopType.Theory,
            Level = WorkshopLevel.Introduction,
            Description = "A first look at AI."
        };
        await col.InsertOneAsync(workshop);

        var response = await _client!.GetAsync($"/workshops/{workshop.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<Workshop>();
        result!.Title.Should().Be("Intro to AI");
    }

    // ── Cycle 2: GET /workshops/{id} — not found ──────────────────────────

    [Fact]
    public async Task GetWorkshopById_NonExistingId_Returns404()
    {
        var response = await _client!.GetAsync("/workshops/000000000000000000000000");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Cycle 3: POST /workshops — unauthenticated → 401 ─────────────────

    [Fact]
    public async Task PostWorkshop_WithoutJwt_Returns401()
    {
        var response = await _client!.PostAsJsonAsync("/workshops", new
        {
            title = "New Workshop",
            type = "Theory",
            level = "Introduction"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Cycle 4: POST /workshops — authenticated → 201 ───────────────────

    [Fact]
    public async Task PostWorkshop_WithValidJwt_Returns201WithCreatedWorkshop()
    {
        var token = await GetAdminTokenAsync();
        _client!.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync("/workshops", new
        {
            title = "New Workshop",
            type = 0, // Theory
            level = 0  // Introduction
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<Workshop>();
        created!.Title.Should().Be("New Workshop");
        created.Id.Should().NotBeNullOrEmpty();
    }

    // ── Cycle 5: PUT /workshops/{id} — authenticated → 200 ───────────────

    [Fact]
    public async Task PutWorkshop_WithValidJwt_Returns200WithUpdatedWorkshop()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        var workshop = new Workshop { Title = "Original Title", Type = WorkshopType.Theory, Level = WorkshopLevel.Introduction };
        await col.InsertOneAsync(workshop);

        var token = await GetAdminTokenAsync();
        _client!.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        workshop.Title = "Updated Title";
        var response = await _client.PutAsJsonAsync($"/workshops/{workshop.Id}", workshop);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<Workshop>();
        updated!.Title.Should().Be("Updated Title");
    }

    // ── Cycle 6: DELETE /workshops/{id} — authenticated → 204 ────────────

    [Fact]
    public async Task DeleteWorkshop_WithValidJwt_Returns204()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        var workshop = new Workshop { Title = "To Delete", Type = WorkshopType.Exercise, Level = WorkshopLevel.Introduction };
        await col.InsertOneAsync(workshop);

        var token = await GetAdminTokenAsync();
        _client!.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.DeleteAsync($"/workshops/{workshop.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Confirm it's gone
        var getResponse = await _client.GetAsync($"/workshops/{workshop.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
