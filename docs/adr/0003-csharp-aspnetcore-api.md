# C# ASP.NET Core (controller-based) as the API layer

The backend is a separate ASP.NET Core Web API service (C#) using the controller-based pattern, distinct from the React frontend. The frontend (Vite + React + TypeScript) calls the API over HTTP. Both services run as separate Docker containers alongside a MongoDB container. Controllers are used over Minimal API because the surface has multiple resource types (workshops, tracks, admin auth) and controllers keep each resource cleanly separated as the API grows.

## Considered options

- **Next.js App Router (API Routes)** — single repo, but ties the backend to Node.js/TypeScript and complicates future Agent/MCP integration in C#.
- **ASP.NET Core + Vite React** — clean separation of concerns, familiar C# backend, easy to extend with additional services.
