using FluentAssertions;
using WorkshopOrif.Api.Models;
using WorkshopOrif.Api.Services;

namespace WorkshopOrif.Api.Tests;

public class ExerciseRuntimeValidatorTests
{
    private readonly ExerciseRuntimeValidator _validator = new();

    private static ExerciseRuntime Runtime(string compose) => new()
    {
        Compose = compose,
        DevService = "workshop"
    };

    [Fact]
    public void Validate_AcceptsMinimalComposeWithWorkspaceRelativeVolume()
    {
        var compose = """
            services:
              workshop:
                image: python:3.11
                volumes:
                  - .:/workspace
            """;

        var result = _validator.Validate(Runtime(compose));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_RejectsPrivilegedService()
    {
        var compose = """
            services:
              workshop:
                image: python:3.11
                privileged: true
            """;

        var result = _validator.Validate(Runtime(compose));

        result.IsValid.Should().BeFalse();
        result.Error.Should().Contain("privileged");
    }

    [Fact]
    public void Validate_RejectsHostNetworkMode()
    {
        var compose = """
            services:
              workshop:
                image: python:3.11
                network_mode: host
            """;

        var result = _validator.Validate(Runtime(compose));

        result.IsValid.Should().BeFalse();
        result.Error.Should().Contain("host network");
    }

    [Fact]
    public void Validate_RejectsDockerSocketMount()
    {
        var compose = """
            services:
              workshop:
                image: python:3.11
                volumes:
                  - /var/run/docker.sock:/var/run/docker.sock
            """;

        var result = _validator.Validate(Runtime(compose));

        result.IsValid.Should().BeFalse();
        result.Error.Should().Contain("docker.sock");
    }

    [Fact]
    public void Validate_RejectsAbsoluteHostVolumeMount()
    {
        var compose = """
            services:
              workshop:
                image: python:3.11
                volumes:
                  - /etc/passwd:/etc/passwd
            """;

        var result = _validator.Validate(Runtime(compose));

        result.IsValid.Should().BeFalse();
        result.Error.Should().Contain("workspace-relative");
    }
}
