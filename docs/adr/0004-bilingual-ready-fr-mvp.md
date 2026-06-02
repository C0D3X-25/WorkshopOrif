# Bilingual-ready UI with French-only workshop content for MVP

The app UI is fully bilingual (FR + EN) using `react-i18next`, with locale JSON files for all chrome (labels, buttons, navigation, profile picker). Workshop content (Markdown body, questions) is stored per-locale in MongoDB (`contentFr`, `contentEn` fields), making the schema bilingual-ready from day one. For the MVP, only French workshop content is authored; the `contentEn` field is left empty. English content can be added later without any schema or API changes.

## Considered options

- **French only, full app** — simpler short-term but requires a rewrite to add English later.
- **Both languages from day one including content** — correct architecture but doubles authoring effort before content exists.
