# Admin UI protected by single environment-variable password

For the MVP, the Admin UI is protected by a single hardcoded password stored as an environment variable (`ADMIN_PASSWORD`). Authentication is checked server-side; a JWT cookie with a short expiry is issued on success. No user accounts or OAuth are implemented. This is sufficient for a small internal training tool where the author pool is one or two people.

## Status

accepted — revisit if multi-author or audit requirements emerge
