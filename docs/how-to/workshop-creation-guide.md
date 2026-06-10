# How-To Guides

This section contains practical guides for creating, managing, and maintaining workshops in the WorkshopOrif application.

## Quick Navigation

| Guide | Purpose | Audience |
|-------|---------|----------|
| [Workshop Style Guide](./workshop-style-guide.md) | Best practices for writing workshop content | Content creators |
| [JSON Reference](./json-reference.md) | Complete field reference for workshop JSON | Content creators, developers |
| [Templates](./templates/) | Starter templates for common workshop types | Content creators |

---

## Getting Started

### Prerequisites

Before creating workshops, ensure you have:

1. **Admin access** — You need the admin password to import workshops
2. **Basic JSON knowledge** — Workshops are defined in JSON format
3. **Markdown familiarity** — Chapter content uses Markdown syntax
4. **Docker running locally** (optional) — For testing imports before production

### Your First Workshop

1. **Copy a template** from the [`templates/`](./templates/) folder
2. **Edit the JSON** with your content (use a JSON-aware editor like VS Code)
3. **Validate your JSON** (see below)
4. **Import via API** or place in `backend/WorkshopOrif.Api/data/workshops/`
5. **Test in the app** — Verify rendering and quiz functionality

---

## Workshop Creation Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Plan      │───▶│   Write     │───▶│   Validate  │
│   Content   │    │   JSON      │    │   JSON      │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Publish   │◀───│   Review    │◀───│   Import    │
│   / Share   │    │   Content   │    │   & Test    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 1. Plan Your Content

Determine:
- **Target audience** — Which profile(s) is this for? (intern/observer/apprentice)
- **Type** — Theory (concepts) or Exercise (hands-on)
- **Level** — Introduction (basics) or Advanced (deep dive)
- **Duration** — Estimated time in minutes
- **Prerequisites** — Required prior knowledge

### 2. Structure Your Workshop

Recommended chapter flow:

```
Section: "Théorie"
├── Chapter 1: Introduction/Context
├── Chapter 2: Core Concepts
└── Chapter 3: Examples/Case Studies

Section: "Exercice"
├── Chapter 4: Setup Instructions
├── Chapter 5: Guided Practice
└── Chapter 6: Independent Work
```

### 3. Write the JSON

Use the [JSON Reference](./json-reference.md) for field descriptions.

**Key tips:**
- Start with a [template](./templates/)
- Use the `blocks` array for structured content (preferred)
- Include quiz questions at the end of each section
- Test formatting before finalizing

### 4. Validate Your JSON

**Online validators:**
- [jsonlint.com](https://jsonlint.com)
- VS Code (built-in validation)

**Command line:**
```bash
# Using Node.js
node -e "JSON.parse(require('fs').readFileSync('workshop.json'))"
```

**Common errors:**
- Trailing commas (not allowed in JSON)
- Unescaped quotes in strings
- Missing required fields (`title`, `description`, etc.)
- Invalid date format (must be `YYYY-MM-DD`)

### 5. Import & Test

**Method A: Via API (for production)**

```bash
curl -X POST http://localhost/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}' \
  -c cookies.txt

curl -X POST http://localhost/api/admin/workshops/import \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d @workshop.json
```

**Method B: File drop (for local development)**

1. Place `workshop.json` in `backend/WorkshopOrif.Api/data/workshops/`
2. Restart the API container: `docker compose restart api`
3. Data seeder will automatically import on startup

### 6. Review & Iterate

Check in the browser:
- [ ] Title and description display correctly
- [ ] Chapters render in correct order
- [ ] Markdown formatting works (bold, lists, etc.)
- [ ] Tables display correctly
- [ ] Quiz questions show and validate properly
- [ ] Print/PDF export looks good

---

## Content Guidelines

### Language & Tone

- **French** — All content should be in French (this is for ORIF)
- **Professional but accessible** — Avoid jargon without explanation
- **Action-oriented** — Use imperative for instructions ("Cliquez sur...", "Rédigez...")

### Length Guidelines

| Component | Recommended |
|-----------|-------------|
| Workshop title | 3-8 words |
| Description | 1-2 sentences |
| Chapter content | 200-800 words |
| Quiz questions | 3-5 per major section |
| Duration | 45-180 minutes |

### Quiz Best Practices

1. **Mix question types** — Single choice for facts, multiple choice for nuances
2. **Plausible distractors** — Wrong answers should be believable
3. **Clear explanations** — Explain why the correct answer is right
4. **Progressive difficulty** — Start easy, increase complexity

Example:
```json
{
  "text": "Quel est le principal avantage de l'IA générative ?",
  "type": "single",
  "options": [
    { "text": "Automatiser la création de contenu", "isCorrect": true },
    { "text": "Remplacer tous les employés", "isCorrect": false },
    { "text": "Réduire les coûts énergétiques", "isCorrect": false }
  ],
  "explanation": "L'IA générative excelle dans la création automatisée de texte, images, et code, augmentant la productivité sans remplacer le jugement humain."
}
```

---

## Updating Existing Workshops

### Check for Existing Title

The import API checks for duplicate titles. To update:

```bash
# Force update (overwrites existing)
curl -X POST "http://localhost/api/admin/workshops/import?force=true" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d @updated-workshop.json
```

### Version Control

Consider keeping workshops in version control:

```
workshops/
├── sensibilisation/
│   ├── intro-ia.json
│   └── usage-etique.json
├── exercices/
│   └── prompt-engineering.json
└── README.md
```

---

## Resources

- [Workshop JSON Format](../workshop-json-format.md) — Full technical specification
- [API Reference](../app/api/api-reference.md) — Import endpoints
- [Backend Data Seeder](../app/backend/backend-architecture.md#data-seeding) — How seeding works

---

## Need Help?

If you encounter issues:

1. Check the [JSON Reference](./json-reference.md) for field requirements
2. Validate your JSON syntax
3. Review the [Style Guide](./workshop-style-guide.md) for content issues
4. Check API response errors in browser dev tools or logs
