# Workshop Style Guide

This guide establishes best practices for creating consistent, high-quality workshop content for the WorkshopOrif platform.

---

## Content Structure

### Workshop Metadata

| Field | Best Practice |
|-------|---------------|
| **Title** | Clear, action-oriented. "Introduction à..." or "Créer un...". Avoid jargon. |
| **Description** | One sentence summarizing the learning outcome. Think "After this, learners will..." |
| **Track** | Use consistent track names: `Sensibilisation`, `Exercices guidés`, `Parcours CFC` |
| **Level** | `Introduction` for first exposure; `Advanced` for practitioners with prior knowledge |
| **Duration** | Be realistic. Include breaks for long sessions (180min = 3h with 15min break). |
| **Authors** | Full names: `["Prénom Nom"]` |

### Chapter Organization

**Recommended Structure:**

```
Section "Théorie"
├── Context & Objectives (why this matters)
├── Core Concepts (what to learn)
└── Examples (how it works)

Section "Exercice" (optional for theory-only workshops)
├── Setup (prerequisites, tools)
├── Guided Practice (step-by-step)
└── Independent Work (apply knowledge)
```

**Section Names to Use:**

| Purpose | Section Name |
|---------|--------------|
| Conceptual content | `Théorie` |
| Hands-on activities | `Exercice` |
| Case studies | `Étude de cas` |
| Assessment | `Évaluation` |

---

## Writing Style

### Tone & Voice

- **Address the learner directly**: "Vous allez découvrir..." not "Les étudiants découvriront..."
- **Active voice**: "Cliquez sur le bouton" not "Le bouton doit être cliqué"
- **Second person**: Guide with "Vous", instructions with imperative

**Good:**
```markdown
Vous allez apprendre à utiliser les IA génératives pour accélérer votre travail quotidien.

### Mise en pratique

1. Ouvrez votre navigateur
2. Accédez à l'interface de ChatGPT
3. Rédigez votre premier prompt
```

**Avoid:**
```markdown
Ce module enseigne l'utilisation des IA génératives.

Les étapes sont les suivantes pour accéder à ChatGPT...
```

### Markdown Formatting

#### Headings

- Use `##` for chapter subdivisions (renders as h2)
- Use `###` for subsections (renders as h3)
- **Never use h1** (`#`) — reserved for chapter title

```markdown
## Concepts fondamentaux

### Qu'est-ce que l'IA générative ?

L'IA générative est une technologie qui...

### Types d'applications

Les principaux cas d'usage incluent...
```

#### Emphasis

- **Bold** (`**text**`) for key terms, important warnings
- *Italics* not typically used (bold is more readable on screens)

#### Lists

Use bullet lists for:
- Features
- Benefits
- Examples

Use numbered lists for:
- Sequential steps
- Ranked priorities
- Process flows

#### Code Blocks

Use fenced code blocks with language identifier:

```markdown
```python
def hello():
    print("Bonjour")
```
```

Languages: `python`, `javascript`, `json`, `bash`, `text`

---

## Content Blocks vs Body

The app supports two content modes. Prefer `blocks` for better rendering control.

### When to Use Each

| Scenario | Use |
|----------|-----|
| Simple text with headings | `blocks` with `type: "content"` |
| Mixed text + table | `blocks` with multiple entries |
| Pure markdown (legacy) | `body` string |
| Complex structured content | `blocks` with element arrays |

### Block Types

#### Content Block (Preferred)

```json
{
  "type": "content",
  "elements": [
    { "type": "heading", "level": 2, "text": "Concepts clés" },
    { "type": "paragraph", "parts": [{ "kind": "text", "value": "L'IA est..." }] },
    { "type": "list", "ordered": false, "items": [...] }
  ]
}
```

**Element types:**
- `heading` — Section headers (level 2 or 3)
- `paragraph` — Text with inline formatting
- `blockquote` — Callouts, quotes
- `list` — Bulleted or numbered lists
- `code` — Code snippets with syntax highlighting

#### Table Block

```json
{
  "type": "table",
  "headers": ["Critère", "IA Traditionnelle", "IA Générative"],
  "rows": [
    ["Sortie", "Prédéfinie", "Nouvelle création"],
    ["Entraînement", "Étiqueté", "Non supervisé"]
  ]
}
```

**Table guidelines:**
- Keep column count ≤ 4 for mobile readability
- Use short header names
- Align similar content types in columns

---

## Quiz Design

### Question Types

**Single Choice** — One correct answer, for facts and definitions:
```json
{
  "text": "Quelle est la définition de l'apprentissage profond ?",
  "type": "single",
  "options": [
    { "text": "Réseaux de neurones avec multiples couches", "isCorrect": true },
    { "text": "Base de données volumineuse", "isCorrect": false },
    { "text": "Interface utilisateur avancée", "isCorrect": false }
  ]
}
```

**Multiple Choice** — Several correct answers, for complex concepts:
```json
{
  "text": "Quels éléments sont nécessaires pour entraîner un modèle d'IA ? (plusieurs réponses)",
  "type": "multiple",
  "options": [
    { "text": "Données d'entraînement", "isCorrect": true },
    { "text": "Algorithmes d'optimisation", "isCorrect": true },
    { "text": "Un superordinateur quantique", "isCorrect": false },
    { "text": "Validation des résultats", "isCorrect": true }
  ]
}
```

### Writing Good Questions

1. **Test understanding, not memory** — Avoid "quizzing the glossary"
   - ❌ "Quelle année a été créée ChatGPT ?" 
   - ✅ "Pourquoi l'année de lancement de ChatGPT a marqué un tournant ?"

2. **Make distractors plausible** — Wrong answers should reflect common misconceptions
   - ❌ Wrong: "42" (obviously wrong)
   - ✅ Better: "Nécessite une connexion constante à Internet" (plausible but wrong for local models)

3. **Keep options parallel** — Similar length, grammar, style
   - ❌ "Économiser du temps" / "La productivité des employés augmentera considérablement grâce à cette technologie"
   - ✅ "Économiser du temps" / "Améliorer la qualité" / "Réduire les coûts"

4. **Explain the "why"** — Explanations reinforce learning
```json
"explanation": "Bien que l'IA générative puisse créer du contenu rapidement, elle nécessite une supervision humaine pour garantir l'exactitude et l'éthique."
```

---

## Profile Targeting

Design workshops for specific learner profiles:

| Profile | Approach | Examples |
|---------|----------|----------|
| **Intern** | High-level concepts, no technical depth | "L'IA dans la société", "Opportunités et risques" |
| **Observer** | Practical focus with guided examples | "Utiliser ChatGPT efficacement", "Créer des prompts" |
| **Apprentice** | Deep technical content, independent work | "Fine-tuning de modèles", "Architecture des LLM" |

### Filtering Logic

The app automatically filters by profile:
- **Interns** see: Theory + Introduction only
- **Observers** see: Introduction level only (all types)
- **Apprentices** see: Everything

**Design implication:** An Advanced workshop will only be visible to Apprentices. Ensure your metadata matches your intended audience.

---

## Visual Consistency

### Standard Headers

Use consistent phrasing:

```
Chapitre X — [Topic]
Exercice X — [Activity]
```

### Material Lists

When listing materials in `requiredMaterials`:
- Be specific: `"Ordinateur avec Python 3.10+"` not `"Ordinateur"`
- Include versions if relevant
- Separate multiple items with array entries, not commas in one string

```json
"requiredMaterials": [
  "Ordinateur avec accès Internet",
  "Compte OpenAI (gratuit)",
  "Navigateur Chrome ou Firefox"
]
```

### Prerequisites

Reference existing workshops by exact title, or list skills:

```json
"prerequisites": [
  "Introduction à l'IA",
  "Connaissance de base en programmation Python"
]
```

---

## Review Checklist

Before publishing, verify:

- [ ] JSON is valid (no trailing commas, valid syntax)
- [ ] Required fields are present (`title`, `description`, `type`, `level`, `track`, `authors`, `estimatedDuration`)
- [ ] Chapters have both `section` and `title`
- [ ] Quiz questions have at least 2 options
- [ ] Each question has at least one `isCorrect: true` option
- [ ] Multiple-choice questions have 2+ correct answers
- [ ] Markdown in `body` or `content` renders correctly
- [ ] Tables have consistent column counts in all rows
- [ ] Duration is realistic (includes breaks for long workshops)
- [ ] Profile targeting matches content difficulty

---

## Templates

Start from a template in the [`templates/`](./templates/) folder:

| Template | Use For |
|----------|---------|
| `theory-intro.json` | Theory workshops for beginners |
| `exercise-guided.json` | Hands-on exercises with steps |

---

## Common Mistakes to Avoid

1. **Duplicate titles** — Workshop titles must be unique (used for duplicate detection)
2. **Inconsistent section names** — Use same spelling/casing for sections across chapters
3. **Empty arrays** — `chapters: []` is valid but check before publishing
4. **Date format** — Use `YYYY-MM-DD`, not locale-specific formats
5. **String vs number** — In import JSON, `type` and `level` are strings; internally they become numbers
