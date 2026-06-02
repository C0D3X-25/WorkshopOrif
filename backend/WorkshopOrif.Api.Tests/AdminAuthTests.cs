using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.MongoDb;

namespace WorkshopOrif.Api.Tests;

public class AdminAuthTests : IAsyncLifetime
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
                builder.UseSetting("AdminPassword", "secret123");
                builder.UseSetting("Jwt:Secret", "test-jwt-secret-that-is-at-least-32-chars!!");
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

    // ── Cycle 3: Admin auth ────────────────────────────────────────────────

    [Fact]
    public async Task PostAdminLogin_CorrectPassword_Returns200AndSetsJwtCookie()
    {
        var response = await _client!.PostAsJsonAsync("/admin/login", new { password = "secret123" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().ContainKey("Set-Cookie");
        var cookie = response.Headers.GetValues("Set-Cookie").FirstOrDefault();
        cookie.Should().Contain("auth=");
    }

    [Fact]
    public async Task PostAdminLogin_WrongPassword_Returns401()
    {
        var response = await _client!.PostAsJsonAsync("/admin/login", new { password = "wrong" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PostAdminLogin_MissingPassword_Returns400()
    {
        var response = await _client!.PostAsJsonAsync("/admin/login", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
