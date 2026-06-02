using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WorkshopOrif.Api.Models;

public enum WorkshopLevel { Introduction, Advanced }
public enum WorkshopType { Theory, Exercise }

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

public class Chapter
{
    public string Section { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
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
}
