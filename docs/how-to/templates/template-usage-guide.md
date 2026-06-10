# Workshop Templates

These JSON templates provide starting points for creating new workshops.

## Available Templates

| Template | Type | Level | Use Case |
|----------|------|-------|----------|
| [theory-intro.json](./theory-intro.json) | Theory | Introduction | Conceptual workshops, presentations |
| [exercise-guided.json](./exercise-guided.json) | Exercise | Introduction | Hands-on practical workshops |

## How to Use

1. **Copy** the template file to your working directory
2. **Rename** it to match your workshop title (use kebab-case)
3. **Edit** all placeholder content marked with `[brackets]` or `TEMPLATE`
4. **Validate** the JSON syntax
5. **Import** via API or place in the data directory

## Customization Guide

### Changing the Profile Target

Edit these fields to match your audience:

```json
{
  "level": "Introduction",    // or "Advanced"
  "track": "Sensibilisation"  // or "Exercices guidés", "Parcours CFC"
}
```

**Profile visibility:**
- `level: "Introduction"` → Visible to Interns, Observers, Apprentices
- `level: "Advanced"` → Visible only to Apprentices

### Adding Chapters

Duplicate a chapter object in the `chapters` array and modify:

```json
{
  "section": "Théorie",
  "title": "Chapitre X — Votre titre",
  "body": "Votre contenu en Markdown...",
  "questions": [...]
}
```

### Using Content Blocks

For structured content, use `blocks` instead of `body`:

```json
{
  "section": "Théorie",
  "title": "Avec contenu structuré",
  "blocks": [
    {
      "type": "content",
      "elements": [
        { "type": "heading", "level": 2, "text": "Titre" },
        { "type": "paragraph", "parts": [{ "kind": "text", "value": "Texte..." }] }
      ]
    },
    {
      "type": "table",
      "headers": ["Col1", "Col2"],
      "rows": [["A", "B"]]
    }
  ]
}
```

## Template Structure

### Theory Template

- 3 chapters in "Théorie" section
- Mix of body markdown and blocks
- 1-2 questions per chapter
- Designed for classroom presentation

### Exercise Template

- 4 chapters: 1 theory + 3 exercise sections
- Structured blocks for instructions
- Progressive difficulty (guided → autonomous)
- Material requirements specified

## Validation

Before using, validate your customized template:

```bash
# Using Node.js
node -e "JSON.parse(require('fs').readFileSync('your-workshop.json')); console.log('Valid!')"
```

## Next Steps

See the [JSON Reference](../json-reference.md) for complete field documentation.
