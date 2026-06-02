using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api.Controllers;

[ApiController]
[Route("admin")]
public class AdminController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IMongoCollection<Workshop> _workshops;

    public AdminController(IConfiguration config, IMongoDatabase db)
    {
        _config = config;
        _workshops = db.GetCollection<Workshop>("workshops");
    }

    public record LoginRequest(string? Password);

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Password))
            return BadRequest();

        var adminPassword = _config["AdminPassword"];
        if (request.Password != adminPassword)
            return Unauthorized();

        var jwtSecret = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var token = new JwtSecurityToken(
            claims: [new Claim(ClaimTypes.Role, "Admin")],
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        Response.Cookies.Append("auth", tokenString, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(8)
        });

        return Ok();
    }

    // ── Workshop import ───────────────────────────────────────────────────

    [Authorize]
    [HttpPost("workshops/import")]
    public async Task<IActionResult> ImportWorkshop(
        [FromBody] WorkshopImportDto dto,
        [FromQuery] bool force = false)
    {
        var workshop = dto.ToWorkshop();
        var existing = await _workshops.Find(w => w.Title == workshop.Title).FirstOrDefaultAsync();

        if (existing is not null && !force)
        {
            return Conflict(new
            {
                message = $"Un atelier avec le titre \"{existing.Title}\" existe déjà.",
                existingId = existing.Id,
                title = existing.Title,
                chapterCount = existing.Chapters.Length,
                questionCount = existing.Chapters.Sum(c => c.Questions.Length)
            });
        }

        if (existing is not null)
        {
            workshop.Id = existing.Id;
            await _workshops.ReplaceOneAsync(w => w.Id == existing.Id, workshop);
            return Ok(new { id = workshop.Id });
        }

        await _workshops.InsertOneAsync(workshop);
        return Created($"/workshops/{workshop.Id}", new { id = workshop.Id });
    }

    // ── Workshop export ───────────────────────────────────────────────────

    [Authorize]
    [HttpGet("workshops/{id}/export")]
    public async Task<IActionResult> ExportWorkshop(string id)
    {
        var workshop = await _workshops.Find(w => w.Id == id).FirstOrDefaultAsync();
        if (workshop is null) return NotFound();
        return Ok(WorkshopImportDto.FromWorkshop(workshop));
    }
}

