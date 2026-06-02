using System.Text.Json;
using MongoDB.Driver;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api;

public static class DataSeeder
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task SeedAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<Workshop>("workshops");
        var dataDir = Path.Combine(AppContext.BaseDirectory, "data", "workshops");

        if (!Directory.Exists(dataDir))
        {
            Console.Error.WriteLine($"[DataSeeder] Data directory not found: {dataDir}");
            return;
        }

        foreach (var file in Directory.GetFiles(dataDir, "*.json"))
        {
            try
            {
                var json = await File.ReadAllTextAsync(file);
                var dto = JsonSerializer.Deserialize<WorkshopImportDto>(json, _jsonOptions);
                if (dto is null) continue;

                var workshop = dto.ToWorkshop();
                var existing = await col.Find(w => w.Title == workshop.Title).FirstOrDefaultAsync();

                if (existing is null)
                    await col.InsertOneAsync(workshop);
                else
                {
                    workshop.Id = existing.Id;
                    await col.ReplaceOneAsync(w => w.Id == existing.Id, workshop);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[DataSeeder] Failed to load {file}: {ex.Message}");
            }
        }
    }
}
