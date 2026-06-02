# WorkshopOrif

A web app with a **React (Vite + TypeScript)** frontend and a **C# ASP.NET Core** backend API, backed by MongoDB and deployed via Docker. It teaches people working in IT what AI is, through theory workshops, exercise workshops, and an awareness track. Content is gated by profile.

## Language

**Profile**:
A learner profile that determines which workshops are accessible. Each user is assigned one profile. Three profiles exist: Intern, Observer, and Apprentice.
_Avoid_: Persona, role, user type

**Intern**:
Profile for a half-day stage. Covers introduction-level theory workshops only. Goal: understand that AI is now part of IT jobs. Display label in French UI: **Stage**.
_Avoid_: Stagiaire, Internship

**Observer**:
Profile for a 3-day observation. Covers introduction theory workshops and a small set of simple exercise workshops. Display label in French UI: **Observation**.
_Avoid_: Visiteur

**Apprentice**:
Profile for CFC and pre-apprenticeship students. Covers the full course — all theory workshops (including advanced) and all exercise workshops. Display label in French UI: **CFC**.
_Avoid_: Learner, Student

**Profile Picker**:
A landing screen shown on first visit where the user self-selects their profile. Selection is persisted in localStorage. Can be changed at any time from a settings control.
_Avoid_: Login, onboarding, registration

**Workshop**:
A single unit of learning — either a theory page or a practical exercise. Belongs to one track, has one level, and targets one or more profiles. Users navigate freely between available workshops with no enforced order. Each workshop carries: title, description, date, authors, prerequisites, max concurrent participants, required materials, estimated duration, and expected outcome. Workshop content body is stored as Markdown per locale (`contentFr`, `contentEn`) in MongoDB and rendered on the frontend. MVP ships with French content only.
_Avoid_: Module, lesson, chapter, page

**Level**:
A field on a workshop indicating its depth: `introduction` or `advanced`. Applies to both Theory and Exercise workshops. Access matrix:
- Intern: Theory introduction only
- Observer: Theory introduction + Exercise introduction
- Apprentice: all workshops (both levels, both types)
_Avoid_: Difficulty, tier, grade

**Track**:
A named grouping of workshops sharing a theme. Current tracks: Formation (skill-building) and Sensibilisation (awareness/ethics).
_Avoid_: Section, category, course

**Theory Workshop**:
A workshop that presents concepts and may include questions at the end. Questions are self-assessment only — the user answers, then sees the correct answer with an explanation. No score is stored.
_Avoid_: Theory module, lecture, reading

**Exercise Workshop**:
A workshop that presents a hands-on task for the learner to complete.
_Avoid_: Exercise module, lab, practical

**Question**:
A self-assessment item embedded in a Theory Workshop. Fields: chapterTitle (groups the question under its chapter heading in the UI), text, type (single-choice or multiple-choice), options (each with text and isCorrect), and explanation shown after answering. Stored as an embedded array in the workshop document. Rendered as a grouped interactive self-assessment section after the workshop content body.
_Avoid_: Quiz, test, exercise

**Admin UI**:
A protected route inside the app where authorized authors create and edit workshops directly in MongoDB. Not visible to learners. Accessible at `/admin`.
_Avoid_: CMS, back-office, dashboard

**Locale**:
A supported UI language. The app UI uses `react-i18next` with `fr` and `en` locale files. Workshop content has per-locale Markdown fields. MVP ships French only; English content can be added without schema changes.
_Avoid_: Language, translation
