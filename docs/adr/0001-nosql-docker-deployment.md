# NoSQL database and Docker deployment

The app targets a server-hosted deployment and has a future goal of integrating AI Agents and MCP servers, both of which require a persistent, flexible backend. **MongoDB** is used to store workshops and their content — workshop documents are heterogeneous (theory vs exercise, variable metadata) and MongoDB's document model fits naturally. The full stack is containerised with Docker to make deployment reproducible and to allow Agent/MCP services to be added as additional containers later. Workshop content is created and edited through a protected **Admin UI** inside the app.

## Considered options

- **Static files + localStorage only** — simpler, but cannot support Agents, MCP, or multi-user persistence.
- **SQL (e.g. PostgreSQL)** — valid, but the document-oriented shape of workshop content favours MongoDB over rigid relational tables.
- **Markdown files seeded into DB** — good for version control, but an Admin UI is preferred for a non-developer authoring experience.
