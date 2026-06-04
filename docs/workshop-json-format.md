# Workshop JSON Format

This document describes the JSON structure required to create or import a workshop.

## Top-level fields

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | yes | Display title of the workshop |
| `description` | string | yes | Short summary shown in listings |
| `type` | string | yes | `"Theory"` or `"Exercise"` |
| `level` | string | yes | `"Introduction"` or `"Advanced"` |
| `track` | string | yes | Thematic track (e.g. `"Sensibilisation"`) |
| `authors` | string[] | yes | List of author names |
| `prerequisites` | string[] | no | List of prerequisite workshop titles or topics |
| `requiredMaterials` | string[] | no | List of required materials or tools |
| `maxConcurrentParticipants` | number | no | `0` means unlimited |
| `estimatedDuration` | number | yes | Duration in minutes |
| `date` | string | no | ISO date `"YYYY-MM-DD"` |
| `expectedOutcome` | string | no | Learning objective statement |
| `chapters` | Chapter[] | yes | Ordered list of chapters (can be empty) |

## Chapter

| Field | Type | Required | Description |
|---|---|---|---|
| `section` | string | yes | Section label (e.g. `"Théorie"`, `"Exercice"`) |
| `title` | string | yes | Chapter heading |
| `body` | string | yes* | Main content in Markdown (*optional if `blocks` is used) |
| `blocks` | ContentBlock[] | no | Alternating markdown and structured tables (preferred for tables) |
| `questions` | Question[] | no | Quiz questions for this chapter |

### ContentBlock

| Field | Type | When | Description |
|---|---|---|---|
| `type` | string | always | `"content"`, `"markdown"` (legacy), or `"table"` |
| `elements` | ContentElement[] | `content` | Structured body (headings, paragraphs, lists, etc.) |
| `content` | string | `markdown` | Legacy Markdown fragment |
| `headers` | string[] | `table` | Column headers |
| `rows` | string[][] | `table` | Cell values per row |

### ContentElement

| Field | Type | When | Description |
|---|---|---|---|
| `type` | string | always | `"heading"`, `"paragraph"`, `"blockquote"`, `"list"`, `"code"` |
| `level` | number | `heading` | `2` or `3` |
| `text` | string | `heading` | Heading text |
| `parts` | InlinePart[] | `paragraph`, `blockquote` | Inline runs (`kind`: `text`, `strong`, `code`) |
| `ordered` | boolean | `list` | Ordered (`true`) or bullet list |
| `items` | InlinePart[][] | `list` | One inline run array per list item |
| `language` | string | `code` | Code block language label |
| `code` | string | `code` | Code block body |

Example table block:

```json
{
  "type": "table",
  "headers": ["Niveau", "Correction"],
  "rows": [
    ["0", "agent-exercice/Niveau_0/corrige-formateur.md"]
  ]
}
```

The app renders `blocks` when present; otherwise it falls back to `body`. Helper: `node scripts/extract-markdown-tables.mjs path/to/workshop.json`.

## Question

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | yes | The question prompt |
| `type` | string | yes | `"single"` (one correct answer) or `"multiple"` (several correct answers) |
| `options` | Option[] | yes | Answer choices |
| `explanation` | string | no | Shown after answering, explaining the correct answer |

## Option

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | yes | Answer text |
| `isCorrect` | boolean | yes | Whether this option is correct |

## Minimal example

```json
{
  "title": "Mon atelier",
  "description": "Un atelier d'exemple.",
  "type": "Theory",
  "level": "Introduction",
  "track": "Sensibilisation",
  "authors": ["Prénom Nom"],
  "prerequisites": [],
  "requiredMaterials": [],
  "maxConcurrentParticipants": 0,
  "estimatedDuration": 60,
  "date": "2026-06-02",
  "expectedOutcome": "Comprendre les bases du sujet.",
  "chapters": []
}
```

## Full example with a chapter and questions

```json
{
  "title": "Introduction à l'IA",
  "description": "Découvrir les fondements de l'intelligence artificielle.",
  "type": "Theory",
  "level": "Introduction",
  "track": "Sensibilisation",
  "authors": ["Alice Martin", "Bob Dupont"],
  "prerequisites": [],
  "requiredMaterials": ["Ordinateur avec accès internet"],
  "maxConcurrentParticipants": 20,
  "estimatedDuration": 90,
  "date": "2026-09-01",
  "expectedOutcome": "Être capable d'expliquer ce qu'est l'IA et ses principaux usages.",
  "chapters": [
    {
      "section": "Théorie",
      "title": "Chapitre 1 — Définition",
      "body": "L'IA est un domaine de l'informatique...\n\n## Sous-titre\n\nContenu en **Markdown** supporté.",
      "questions": [
        {
          "text": "Qu'est-ce que l'IA ?",
          "type": "single",
          "options": [
            { "text": "Un domaine créant des systèmes intelligents", "isCorrect": true },
            { "text": "Un simple tableur avancé", "isCorrect": false },
            { "text": "Un réseau social", "isCorrect": false }
          ],
          "explanation": "L'IA vise à créer des systèmes qui réalisent des tâches nécessitant normalement l'intelligence humaine."
        },
        {
          "text": "Quels types d'IA existent ? (plusieurs réponses)",
          "type": "multiple",
          "options": [
            { "text": "IA générative", "isCorrect": true },
            { "text": "IA de reconnaissance d'images", "isCorrect": true },
            { "text": "IA de comptabilité", "isCorrect": false }
          ],
          "explanation": "Les types courants sont : générative, reconnaissance d'images, traduction, agents IA et IA de chat."
        }
      ]
    }
  ]
}
```

## Notes

- The `body` field supports **Markdown** (headings, bold, lists, links, etc.). **Tables** should use `blocks` with `type: "table"` (rendered as HTML in the app, not GFM).
- `type` and `level` are case-insensitive (`"theory"` and `"Theory"` both work).
- Setting `maxConcurrentParticipants` to `0` means no participant limit.
- A workshop with no chapters is valid — chapters can be added later.
- When importing via the API (`POST /api/workshops/import`), the `Id` field is assigned automatically by the database and must not be included in the JSON.
