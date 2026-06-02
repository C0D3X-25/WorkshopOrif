using MongoDB.Driver;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api;

public static class DataSeeder
{
    public static async Task SeedAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<Workshop>("workshops");

        if (await col.CountDocumentsAsync(FilterDefinition<Workshop>.Empty) > 0)
            return;

        await col.InsertManyAsync([
            new Workshop
            {
                Title = "Introduction à l'IA",
                Description = "Comprendre ce qu'est l'intelligence artificielle et son rôle dans les métiers IT.",
                Type = WorkshopType.Theory,
                Level = WorkshopLevel.Introduction,
                Track = "Sensibilisation",
                Authors = ["Formateur ORIF"],
                EstimatedDuration = 30,
                ContentFr = "## Contenu\n\nCet atelier présente les bases de l'IA."
            },
            new Workshop
            {
                Title = "Modèles de langage avancés",
                Description = "Explorer le fonctionnement interne des LLM et leurs limites.",
                Type = WorkshopType.Theory,
                Level = WorkshopLevel.Advanced,
                Track = "Formation",
                Authors = ["Formateur ORIF"],
                EstimatedDuration = 60,
                ContentFr = "## Contenu\n\nCet atelier approfondit les LLM."
            },
            new Workshop
            {
                Title = "Premier prompt",
                Description = "Rédiger et tester son premier prompt avec un assistant IA.",
                Type = WorkshopType.Exercise,
                Level = WorkshopLevel.Introduction,
                Track = "Formation",
                Authors = ["Formateur ORIF"],
                EstimatedDuration = 45,
                ContentFr = "## Exercice\n\nRédigez un prompt pour obtenir une réponse précise."
            },
            new Workshop
            {
                Title = "Fine-tuning d'un modèle",
                Description = "Adapter un modèle pré-entraîné à un cas métier spécifique.",
                Type = WorkshopType.Exercise,
                Level = WorkshopLevel.Advanced,
                Track = "Formation",
                Authors = ["Formateur ORIF"],
                EstimatedDuration = 120,
                ContentFr = "## Exercice\n\nAppliquez le fine-tuning sur un jeu de données fourni."
            },
        ]);
    }
}
