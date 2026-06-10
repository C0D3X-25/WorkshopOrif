# Workshop JSON Reference

Complete reference for the workshop JSON format. This document describes every field available when creating or importing workshops.

For practical guidance on writing content, see the [Workshop Style Guide](./workshop-style-guide.md). For importing workshops, see the [API Reference](../app/api/api-reference.md).

---

## Top-Level Workshop Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | **Yes** | Display title. Must be unique (used for duplicate detection). |
| `description` | `string` | **Yes** | Short summary (1-2 sentences) shown in workshop listings. |
| `type` | `string` | **Yes** | `"Theory"` or `"Exercise"`. Case-insensitive. |
| `level` | `string` | **Yes** | `"Introduction"` or `"Advanced"`. Case-insensitive. |
| `track` | `string` | **Yes** | Thematic track (e.g., `"Sensibilisation"`). Use consistent names. |
| `authors` | `string[]` | **Yes** | Array of author names: `["Prénom Nom"]`. |
| `prerequisites` | `string[]` | No | List of prerequisite workshop titles or topics. |
| `requiredMaterials` | `string[]` | No | List of materials/tools needed (computers, software, accounts). |
| `maxConcurrentParticipants` | `number` | No | Maximum participants. `0` or omit for unlimited. |
| `estimatedDuration` | `number` | **Yes** | Duration in minutes. Be realistic (include breaks for long sessions). |
| `date` | `string` | No | Workshop date in ISO format: `"YYYY-MM-DD"`. |
| `expectedOutcome` | `string` | No | Learning objective statement: "After this workshop, learners will..." |
| `chapters` | `Chapter[]` | **Yes** | Ordered array of content chapters. Can be empty `[]` for drafts. |

---

## Chapter Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `section` | `string` | **Yes** | Section label for grouping. Use consistent names: `"Théorie"`, `"Exercice"`. |
| `title` | `string` | **Yes** | Chapter heading displayed to learners. |
| `body` | `string` | No* | Markdown content. *Required if `blocks` is omitted. |
| `blocks` | `ContentBlock[]` | No | Structured content blocks (preferred over `body`). |
| `questions` | `Question[]` | No | Quiz questions for this chapter. |

**Content Rendering Rule:** If `blocks` is present and non-empty, it is used. Otherwise, `body` is rendered as Markdown.

---

## ContentBlock Variants

Content blocks provide structured rendering. Three types are supported:

### 1. Content Block (Rich Text)

```json
{
  "type": "content",
  "elements": [ContentElement, ...]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"content"` | Block type identifier. |
| `elements` | `ContentElement[]` | Array of content elements (paragraphs, headings, lists, etc.). |

### 2. Markdown Block (Legacy)

```json
{
  "type": "markdown",
  "content": "# Heading\n\nParagraph..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"markdown"` | Block type identifier. |
| `content` | `string` | Markdown-formatted text. |

### 3. Table Block

```json
{
  "type": "table",
  "headers": ["Column 1", "Column 2"],
  "rows": [
    ["Row 1 Cell 1", "Row 1 Cell 2"],
    ["Row 2 Cell 1", "Row 2 Cell 2"]
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"table"` | Block type identifier. |
| `headers` | `string[]` | Column headers. |
| `rows` | `string[][]` | Array of row arrays. Each row has same length as headers. |

---

## ContentElement Object

Elements are used within `content` blocks for structured rich text.

| Field | Type | When Required | Description |
|-------|------|---------------|-------------|
| `type` | `string` | Always | Element type: `"heading"`, `"paragraph"`, `"blockquote"`, `"list"`, `"code"`. |
| `level` | `number` | `type: "heading"` | Heading level: `2` or `3` (h2 or h3). Never use `1`. |
| `text` | `string` | `type: "heading"` | Heading text. |
| `parts` | `InlinePart[]` | `type: "paragraph"`, `"blockquote"` | Inline content runs. |
| `ordered` | `boolean` | `type: "list"` | `true` for numbered, `false` for bullet list. |
| `items` | `InlinePart[][]` | `type: "list"` | Array of items, each item is array of inline parts. |
| `language` | `string` | `type: "code"` | Code language for syntax highlighting: `python`, `javascript`, etc. |
| `code` | `string` | `type: "code"` | Code block content. |

---

## InlinePart Object

Inline formatting within paragraphs, blockquotes, and list items.

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `string` | Format type: `"text"` (plain), `"strong"` (bold), `"code"` (inline code). |
| `value` | `string` | The text content. |

**Example:**
```json
{
  "parts": [
    { "kind": "text", "value": "Use the " },
    { "kind": "code", "value": "import" },
    { "kind": "text", "value": " statement to load modules." }
  ]
}
```
Renders as: Use the `import` statement to load modules.

---

## Question Object

Quiz questions are displayed at the end of a chapter.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | **Yes** | The question prompt shown to learners. |
| `type` | `string` | **Yes** | `"single"` (one correct) or `"multiple"` (several correct). |
| `options` | `Option[]` | **Yes** | Array of answer choices (minimum 2). |
| `explanation` | `string` | No | Explanation shown after answering (why the answer is correct). |

---

## Option Object

Answer choices for questions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | **Yes** | Answer text displayed to learner. |
| `isCorrect` | `boolean` | **Yes** | `true` if this option is correct. |

**Rules:**
- Single choice: exactly one option must have `isCorrect: true`
- Multiple choice: at least two options should have `isCorrect: true`

---

## Complete Examples

### Minimal Workshop (Bare Minimum)

```json
{
  "title": "Mon atelier",
  "description": "Un atelier d'exemple pour démontrer le format.",
  "type": "Theory",
  "level": "Introduction",
  "track": "Sensibilisation",
  "authors": ["Prénom Nom"],
  "prerequisites": [],
  "requiredMaterials": [],
  "maxConcurrentParticipants": 0,
  "estimatedDuration": 60,
  "date": "2026-06-05",
  "expectedOutcome": "Comprendre les bases du sujet.",
  "chapters": []
}
```

### Theory Workshop with Body Markdown

```json
{
  "title": "Introduction à l'IA",
  "description": "Découvrir les fondements de l'intelligence artificielle.",
  "type": "Theory",
  "level": "Introduction",
  "track": "Sensibilisation",
  "authors": ["Alice Martin"],
  "estimatedDuration": 90,
  "chapters": [
    {
      "section": "Théorie",
      "title": "Chapitre 1 — Définitions",
      "body": "L'intelligence artificielle (IA) désigne l'ensemble des techniques permettant aux machines de simuler l'intelligence humaine.\n\n## Applications courantes\n\n- Reconnaissance d'images\n- Traitement du langage naturel\n- Recommandations personnalisées",
      "questions": [
        {
          "text": "Qu'est-ce que l'IA ?",
          "type": "single",
          "options": [
            { "text": "Techniques simulant l'intelligence humaine", "isCorrect": true },
            { "text": "Un type de robot", "isCorrect": false },
            { "text": "Un langage de programmation", "isCorrect": false }
          ],
          "explanation": "L'IA regroupe les techniques permettant aux machines de simuler des fonctions cognitives humaines."
        }
      ]
    }
  ]
}
```

### Exercise Workshop with Structured Blocks

```json
{
  "title": "Créer des prompts efficaces",
  "description": "Atelier pratique sur l'ingénierie de prompts.",
  "type": "Exercise",
  "level": "Introduction",
  "track": "Exercices guidés",
  "authors": ["Bob Dupont"],
  "estimatedDuration": 120,
  "requiredMaterials": ["Ordinateur", "Accès à ChatGPT"],
  "chapters": [
    {
      "section": "Exercice",
      "title": "Pratique guidée",
      "blocks": [
        {
          "type": "content",
          "elements": [
            { "type": "heading", "level": 2, "text": "Étapes à suivre" },
            {
              "type": "list",
              "ordered": true,
              "items": [
                [{ "kind": "text", "value": "Ouvrir ChatGPT" }],
                [{ "kind": "text", "value": "Rédiger un prompt précis" }],
                [{ "kind": "text", "value": "Itérer sur les résultats" }]
              ]
            },
            { "type": "heading", "level": 2, "text": "Exemple de prompt" },
            { "type": "code", "language": "text", "code": "Rédige un email professionnel pour demander un congé..." }
          ]
        },
        {
          "type": "table",
          "headers": ["Élément", "Bon exemple", "Mauvais exemple"],
          "rows": [
            ["Spécificité", "Rédige un email de 150 mots", "Rédige un email"],
            ["Contexte", "Pour un manager de secteur IT", "Pour quelqu'un"]
          ]
        }
      ],
      "questions": [
        {
          "text": "Quels éléments améliorent un prompt ?",
          "type": "multiple",
          "options": [
            { "text": "Spécificité", "isCorrect": true },
            { "text": "Contexte", "isCorrect": true },
            { "text": "Longueur excessive", "isCorrect": false },
            { "text": "Contraintes claires", "isCorrect": true }
          ],
          "explanation": "Un bon prompt est spécifique, contextuel, et définit des contraintes claires sans être excessivement long."
        }
      ]
    }
  ]
}
```

---

## Field Constraints Summary

### Enumerations

| Field | Valid Values | Case |
|-------|--------------|------|
| `type` | `Theory`, `Exercise` | Insensitive |
| `level` | `Introduction`, `Advanced` | Insensitive |
| `question.type` | `single`, `multiple` | Insensitive |

### String Lengths

While not strictly enforced, recommended limits:

| Field | Recommended Max | Reason |
|-------|-----------------|--------|
| `title` | 80 chars | Display in cards |
| `description` | 200 chars | List view readability |
| `chapter.title` | 100 chars | Header display |
| `question.text` | 300 chars | Quiz card width |
| `option.text` | 150 chars | Radio button label |

### Numbers

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `estimatedDuration` | 15 | 480 | Minutes (0.25h - 8h) |
| `maxConcurrentParticipants` | 0 | 1000 | 0 = unlimited |
| `heading.level` | 2 | 3 | h2 or h3 only |

---

## Validation Tips

### Common JSON Errors

1. **Trailing commas** — Not allowed in JSON
   ```json
   // ❌ Wrong
   "authors": ["Alice"],
   "date": "2026-01-01",  // ← trailing comma
   }
   
   // ✅ Correct
   "authors": ["Alice"],
   "date": "2026-01-01"
   }
   ```

2. **Unescaped quotes** — Must escape inner quotes
   ```json
   // ❌ Wrong
   "text": "What is "AI"?"
   
   // ✅ Correct
   "text": "What is \"AI\"?"
   ```

3. **Date format** — Must be `YYYY-MM-DD`
   ```json
   // ❌ Wrong
   "date": "05/06/2026"
   "date": "June 5, 2026"
   
   // ✅ Correct
   "date": "2026-06-05"
   ```

### Validate Before Import

```bash
# Using Node.js
node -e "JSON.parse(require('fs').readFileSync('workshop.json')); console.log('Valid JSON!')"

# Using Python
python -c "import json; json.load(open('workshop.json')); print('Valid JSON!')"
```

---

## Related Documentation

- [Workshop Style Guide](./workshop-style-guide.md) — Best practices for content
- [How-To Overview](./workshop-creation-guide.md) — Creating and importing workshops
- [Templates](./templates/) — Starter workshop JSON files
