using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api.Controllers;

[ApiController]
[Route("workshops")]
public class WorkshopsController : ControllerBase
{
    private readonly IMongoCollection<Workshop> _workshops;

    public WorkshopsController(IMongoDatabase db)
    {
        _workshops = db.GetCollection<Workshop>("workshops");
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Workshop>> GetWorkshop(string id)
    {
        var workshop = await _workshops.Find(w => w.Id == id).FirstOrDefaultAsync();
        if (workshop is null) return NotFound();
        return Ok(workshop);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Workshop>> CreateWorkshop([FromBody] Workshop workshop)
    {
        await _workshops.InsertOneAsync(workshop);
        return CreatedAtAction(nameof(GetWorkshop), new { id = workshop.Id }, workshop);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<ActionResult<Workshop>> UpdateWorkshop(string id, [FromBody] Workshop workshop)
    {
        workshop.Id = id;
        var result = await _workshops.ReplaceOneAsync(w => w.Id == id, workshop);
        if (result.MatchedCount == 0) return NotFound();
        return Ok(workshop);
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkshop(string id)
    {
        var result = await _workshops.DeleteOneAsync(w => w.Id == id);
        if (result.DeletedCount == 0) return NotFound();
        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Workshop>>> GetWorkshops([FromQuery] string profile)
    {
        var filter = profile.ToLowerInvariant() switch
        {
            "intern" => Builders<Workshop>.Filter.And(
                Builders<Workshop>.Filter.Eq(w => w.Type, WorkshopType.Theory),
                Builders<Workshop>.Filter.Eq(w => w.Level, WorkshopLevel.Introduction)),

            "observer" => Builders<Workshop>.Filter.Eq(w => w.Level, WorkshopLevel.Introduction),

            _ => Builders<Workshop>.Filter.Empty, // apprentice: all workshops
        };

        var result = await _workshops.Find(filter).ToListAsync();
        return Ok(result);
    }
}
