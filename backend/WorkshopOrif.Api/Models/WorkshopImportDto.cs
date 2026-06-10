namespace WorkshopOrif.Api.Models;

public class WorkshopImportDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "Theory";
    public string Level { get; set; } = "Introduction";
    public string Track { get; set; } = string.Empty;
    public string[] Authors { get; set; } = [];
    public string[] Prerequisites { get; set; } = [];
    public string[] RequiredMaterials { get; set; } = [];
    public int MaxConcurrentParticipants { get; set; }
    public int EstimatedDuration { get; set; }
    public string? Date { get; set; }
    public string ExpectedOutcome { get; set; } = string.Empty;
    public Chapter[] Chapters { get; set; } = [];
    public ExerciseRuntime? ExerciseRuntime { get; set; }

    public Workshop ToWorkshop() => new()
    {
        Title = Title,
        Description = Description,
        Type = Enum.TryParse<WorkshopType>(Type, ignoreCase: true, out var wt) ? wt : WorkshopType.Theory,
        Level = Enum.TryParse<WorkshopLevel>(Level, ignoreCase: true, out var wl) ? wl : WorkshopLevel.Introduction,
        Track = Track,
        Authors = Authors,
        Prerequisites = Prerequisites,
        RequiredMaterials = RequiredMaterials,
        MaxConcurrentParticipants = MaxConcurrentParticipants,
        EstimatedDuration = EstimatedDuration,
        Date = Date is not null
            ? DateTime.SpecifyKind(DateTime.Parse(Date), DateTimeKind.Utc)
            : default,
        ExpectedOutcome = ExpectedOutcome,
        Chapters = Chapters,
        ExerciseRuntime = ExerciseRuntime
    };

    public static WorkshopImportDto FromWorkshop(Workshop w) => new()
    {
        Title = w.Title,
        Description = w.Description,
        Type = w.Type.ToString(),
        Level = w.Level.ToString(),
        Track = w.Track,
        Authors = w.Authors,
        Prerequisites = w.Prerequisites,
        RequiredMaterials = w.RequiredMaterials,
        MaxConcurrentParticipants = w.MaxConcurrentParticipants,
        EstimatedDuration = w.EstimatedDuration,
        Date = w.Date == default ? null : w.Date.ToString("yyyy-MM-dd"),
        ExpectedOutcome = w.ExpectedOutcome,
        Chapters = w.Chapters,
        ExerciseRuntime = w.ExerciseRuntime
    };
}
