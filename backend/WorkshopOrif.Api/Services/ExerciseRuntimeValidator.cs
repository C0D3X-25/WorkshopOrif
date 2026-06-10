using System.Text.RegularExpressions;
using WorkshopOrif.Api.Models;
using YamlDotNet.RepresentationModel;

namespace WorkshopOrif.Api.Services;

public record ExerciseRuntimeValidationResult(bool IsValid, string? Error = null);

public interface IExerciseRuntimeValidator
{
    ExerciseRuntimeValidationResult Validate(ExerciseRuntime? runtime);
}

public partial class ExerciseRuntimeValidator : IExerciseRuntimeValidator
{
    public ExerciseRuntimeValidationResult Validate(ExerciseRuntime? runtime)
    {
        if (runtime is null)
            return new ExerciseRuntimeValidationResult(true);

        if (string.IsNullOrWhiteSpace(runtime.Compose))
            return new ExerciseRuntimeValidationResult(false, "compose is required");

        if (string.IsNullOrWhiteSpace(runtime.DevService))
            return new ExerciseRuntimeValidationResult(false, "devService is required");

        YamlMappingNode root;
        try
        {
            var stream = new YamlStream();
            using var reader = new StringReader(runtime.Compose);
            stream.Load(reader);
            if (stream.Documents.Count == 0 || stream.Documents[0].RootNode is not YamlMappingNode mapping)
                return new ExerciseRuntimeValidationResult(false, "compose must be a YAML mapping");

            root = mapping;
        }
        catch (Exception)
        {
            return new ExerciseRuntimeValidationResult(false, "compose is not valid YAML");
        }

        if (!root.Children.TryGetValue(new YamlScalarNode("services"), out var servicesNode)
            || servicesNode is not YamlMappingNode services)
        {
            return new ExerciseRuntimeValidationResult(false, "compose must define services");
        }

        if (!services.Children.ContainsKey(new YamlScalarNode(runtime.DevService)))
        {
            return new ExerciseRuntimeValidationResult(
                false,
                $"devService \"{runtime.DevService}\" is not defined in compose services");
        }

        foreach (var serviceEntry in services.Children)
        {
            if (serviceEntry.Value is not YamlMappingNode service)
                continue;

            var privileged = ReadBool(service, "privileged");
            if (privileged == true)
                return new ExerciseRuntimeValidationResult(false, "privileged mode is not allowed");

            var networkMode = ReadScalar(service, "network_mode");
            if (string.Equals(networkMode, "host", StringComparison.OrdinalIgnoreCase))
                return new ExerciseRuntimeValidationResult(false, "host network mode is not allowed");

            foreach (var volume in ReadVolumeHostPaths(service))
            {
                if (volume.Contains("docker.sock", StringComparison.OrdinalIgnoreCase))
                    return new ExerciseRuntimeValidationResult(false, "mounting docker.sock is not allowed");

                if (!IsWorkspaceRelativeHostPath(volume))
                {
                    return new ExerciseRuntimeValidationResult(
                        false,
                        "volume mounts must be workspace-relative (host path must start with \".\")");
                }
            }
        }

        return new ExerciseRuntimeValidationResult(true);
    }

    private static bool? ReadBool(YamlMappingNode node, string key)
    {
        if (!node.Children.TryGetValue(new YamlScalarNode(key), out var valueNode))
            return null;

        return valueNode switch
        {
            YamlScalarNode scalar when bool.TryParse(scalar.Value, out var b) => b,
            _ => null
        };
    }

    private static string? ReadScalar(YamlMappingNode node, string key)
    {
        if (!node.Children.TryGetValue(new YamlScalarNode(key), out var valueNode))
            return null;

        return valueNode is YamlScalarNode scalar ? scalar.Value : null;
    }

    private static IEnumerable<string> ReadVolumeHostPaths(YamlMappingNode service)
    {
        if (!service.Children.TryGetValue(new YamlScalarNode("volumes"), out var volumesNode))
            yield break;

        if (volumesNode is YamlSequenceNode sequence)
        {
            foreach (var item in sequence.Children)
            {
                var hostPath = ExtractHostPath(item);
                if (hostPath is not null)
                    yield return hostPath;
            }
            yield break;
        }

        if (volumesNode is YamlMappingNode mapping)
        {
            foreach (var entry in mapping.Children)
            {
                if (entry.Key is YamlScalarNode key)
                {
                    var hostPath = ExtractHostPath(key.Value);
                    if (hostPath is not null)
                        yield return hostPath;
                }
            }
        }
    }

    private static string? ExtractHostPath(YamlNode node)
    {
        if (node is YamlScalarNode scalar)
            return ExtractHostPath(scalar.Value);

        return null;
    }

    private static string? ExtractHostPath(string? spec)
    {
        if (string.IsNullOrWhiteSpace(spec))
            return null;

        var trimmed = spec.Trim();
        if (trimmed.StartsWith('"') && trimmed.EndsWith('"'))
            trimmed = trimmed[1..^1];

        var colonIndex = trimmed.IndexOf(':');
        if (colonIndex <= 0)
            return null;

        return trimmed[..colonIndex];
    }

    private static bool IsWorkspaceRelativeHostPath(string hostPath)
    {
        if (hostPath.StartsWith('.'))
            return !hostPath.StartsWith("..", StringComparison.Ordinal);

        if (WindowsDrivePattern().IsMatch(hostPath))
            return false;

        return !hostPath.StartsWith('/') && !hostPath.StartsWith('\\');
    }

    [GeneratedRegex(@"^[A-Za-z]:[\\/]")]
    private static partial Regex WindowsDrivePattern();
}
