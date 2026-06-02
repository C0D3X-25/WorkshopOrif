# ADR 0006 — JWT authentication accepts cookie and Authorization header

**Date:** 2026-06-02  
**Status:** Accepted

## Context

The `POST /admin/login` endpoint issues an `auth` HttpOnly cookie containing a JWT (HS256, 8h). Protected endpoints (`POST/PUT/DELETE /workshops`) need to validate that token. ASP.NET Core's JWT Bearer middleware reads from the `Authorization: Bearer` header by default.

## Decision

Configure `OnMessageReceived` to extract the token from the `auth` cookie first; if absent, fall back to the standard `Authorization: Bearer` header.

## Consequences

- The browser-based Admin UI works with the cookie automatically — no JS token handling needed.
- `.http` scratch files and `dotnet test` integration tests can pass a `Bearer` token in the header without needing cookie plumbing.
- Both paths validate the same secret and claims — no separate code path.
- Accepting the header is a minor relaxation of the security model (cookie-only would prevent certain CSRF vectors), but `SameSite=Strict` on the cookie already mitigates CSRF for browser clients.
