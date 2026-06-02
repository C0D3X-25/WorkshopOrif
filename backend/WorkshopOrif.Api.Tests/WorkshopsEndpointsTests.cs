using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using Testcontainers.MongoDb;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api.Tests;

public class WorkshopsEndpointsTests : IAsyncLifetime
{
    private readonly MongoDbContainer _mongoContainer = new MongoDbBuilder()
        .WithImage("mongo:8.0")
        .Build();
    private WebApplicationFactory<Program>? _factory;
    private HttpClient? _client;

    public async Task InitializeAsync()
    {
        await _mongoContainer.StartAsync();

        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("environment", "Testing");
                builder.UseSetting("MongoDB:ConnectionString", _mongoContainer.GetConnectionString());
                builder.UseSetting("MongoDB:DatabaseName", "workshoporif_test");
                builder.UseSetting("Jwt:Secret", "test-jwt-secret-that-is-at-least-32-chars!!");
            });

        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null) await _factory.DisposeAsync();
        await _mongoContainer.DisposeAsync();
    }

    // ── Cycle 1: Tracer Bullet ─────────────────────────────────────────────

    [Fact]
    public async Task GetWorkshops_WithApprenticeProfile_ReturnsOkWithEmptyList_WhenNoWorkshopsExist()
    {
        var response = await _client!.GetAsync("/workshops?profile=apprentice");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var workshops = await response.Content.ReadFromJsonAsync<Workshop[]>();
        workshops.Should().BeEmpty();
    }

    // ── Cycle 2: Profile access matrix ────────────────────────────────────

    [Fact]
    public async Task GetWorkshops_WithInternProfile_ReturnsOnlyTheoryIntroductionWorkshops()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        await col.InsertManyAsync([
            new Workshop { Title = "AI Basics",     Type = WorkshopType.Theory,   Level = WorkshopLevel.Introduction },
            new Workshop { Title = "AI Advanced",   Type = WorkshopType.Theory,   Level = WorkshopLevel.Advanced },
            new Workshop { Title = "AI Hands-on",   Type = WorkshopType.Exercise, Level = WorkshopLevel.Introduction },
        ]);

        var response = await _client!.GetAsync("/workshops?profile=intern");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var workshops = await response.Content.ReadFromJsonAsync<Workshop[]>();
        workshops.Should().HaveCount(1);
        workshops![0].Title.Should().Be("AI Basics");
    }

    [Fact]
    public async Task GetWorkshops_WithObserverProfile_ReturnsTheoryAndExerciseIntroductionWorkshops()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        await col.InsertManyAsync([
            new Workshop { Title = "AI Basics",     Type = WorkshopType.Theory,   Level = WorkshopLevel.Introduction },
            new Workshop { Title = "AI Advanced",   Type = WorkshopType.Theory,   Level = WorkshopLevel.Advanced },
            new Workshop { Title = "AI Hands-on",   Type = WorkshopType.Exercise, Level = WorkshopLevel.Introduction },
            new Workshop { Title = "AI Expert Lab", Type = WorkshopType.Exercise, Level = WorkshopLevel.Advanced },
        ]);

        var response = await _client!.GetAsync("/workshops?profile=observer");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var workshops = await response.Content.ReadFromJsonAsync<Workshop[]>();
        workshops.Should().HaveCount(2);
        workshops.Should().Contain(w => w.Title == "AI Basics");
        workshops.Should().Contain(w => w.Title == "AI Hands-on");
    }

    [Fact]
    public async Task GetWorkshops_WithApprenticeProfile_ReturnsAllWorkshops()
    {
        using var scope = _factory!.Services.CreateScope();
        var col = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<Workshop>("workshops");

        await col.InsertManyAsync([
            new Workshop { Title = "AI Basics",     Type = WorkshopType.Theory,   Level = WorkshopLevel.Introduction },
            new Workshop { Title = "AI Advanced",   Type = WorkshopType.Theory,   Level = WorkshopLevel.Advanced },
            new Workshop { Title = "AI Hands-on",   Type = WorkshopType.Exercise, Level = WorkshopLevel.Introduction },
            new Workshop { Title = "AI Expert Lab", Type = WorkshopType.Exercise, Level = WorkshopLevel.Advanced },
        ]);

        var response = await _client!.GetAsync("/workshops?profile=apprentice");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var workshops = await response.Content.ReadFromJsonAsync<Workshop[]>();
        workshops.Should().HaveCount(4);
    }
}
