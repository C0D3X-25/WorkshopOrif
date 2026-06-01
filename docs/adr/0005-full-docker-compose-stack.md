# Full Docker Compose stack for both development and production

All three services (React frontend, ASP.NET Core API, MongoDB) run via Docker Compose in both development and production. This simplifies onboarding (single `docker compose up` to run everything) and eliminates environment drift between dev and prod. The frontend container uses Vite's dev server with hot-reload in development; in production it serves a static build via Nginx.
