using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WorkshopOrif.Api.Models;

public enum WorkshopLevel { Introduction, Advanced }
public enum WorkshopType { Theory, Exercise }

public class DevContainerConfig
{
    public string[] Extensions { get; set; } = [];
    public Dictionary<string, string> Features { get; set; } = new();
    public string PostCreateCommand { get; set; } = string.Empty;
}

public class WorkspaceFile
{
    public string Name { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string? GitUrl { get; set; }
}

public class PortMapping
{
    public int ContainerPort { get; set; }
    public int HostPort { get; set; }
}

public class DockerEnvironment
{
    public string Image { get; set; } = string.Empty;
    public DevContainerConfig DevContainer { get; set; } = new();
    public WorkspaceFile[] WorkspaceFiles { get; set; } = [];
    public PortMapping[] Ports { get; set; } = [];
    public Dictionary<string, string> Env { get; set; } = new();
}

public class QuestionOption
{
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public class Question
{
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = "single";
    public QuestionOption[] Options { get; set; } = [];
    public string Explanation { get; set; } = string.Empty;
}

public class InlinePart
{
    public string Kind { get; set; } = "text";
    public string Value { get; set; } = string.Empty;
}

public class ContentElement
{
    public string Type { get; set; } = string.Empty;
    public int Level { get; set; }
    public string Text { get; set; } = string.Empty;
    public InlinePart[] Parts { get; set; } = [];
    public bool Ordered { get; set; }
    public InlinePart[][] Items { get; set; } = [];
    public string Language { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class ContentBlock
{
    public string Type { get; set; } = "markdown";
    public string Content { get; set; } = string.Empty;
    public ContentElement[] Elements { get; set; } = [];
    public string[] Headers { get; set; } = [];
    public string[][] Rows { get; set; } = [];
}

public class Chapter
{
    public string Section { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public ContentBlock[] Blocks { get; set; } = [];
    public Question[] Questions { get; set; } = [];
}

public class Workshop
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string[] Authors { get; set; } = [];
    public string[] Prerequisites { get; set; } = [];
    public int MaxConcurrentParticipants { get; set; }
    public string[] RequiredMaterials { get; set; } = [];
    public int EstimatedDuration { get; set; }
    public string ExpectedOutcome { get; set; } = string.Empty;
    public WorkshopLevel Level { get; set; }
    public WorkshopType Type { get; set; }
    public string Track { get; set; } = string.Empty;
    public Chapter[] Chapters { get; set; } = [];

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DockerEnvironment? DockerEnvironment { get; set; }
}
