# Phase 4: Multi-User Production Integration - Context

**Gathered:** June 22, 2026
**Status:** Ready for planning
**Source:** Planning Mode

<domain>
## Phase Boundary
This phase implements the infrastructure and UI changes necessary to convert the single-user application into a multi-user, production-ready SaaS. This includes setting up Supabase Auth on frontend/backend, adding a PostgreSQL database for saving user profiles, encrypting secrets at rest on the database, and integrating LinkedIn OAuth 2.0.

</domain>

<decisions>
## Implementation Decisions

### Authentication
- **Supabase Auth**: React client authenticates users via Supabase authentication. On success, the client passes the Supabase JWT token inside the `Authorization: Bearer <token>` header on API requests.
- **Express Middleware**: A backend auth middleware intercepts routes, queries Supabase `/auth/v1/user` or checks user token signatures, and sets `req.user`.

### Database & Security
- **PostgreSQL Settings Table**: A `user_settings` table is created linking user configuration to their user ID.
- **AES-256-GCM Encryption**: Server encrypts Gemini, OpenAI, Anthropic, Tavily, and LinkedIn access tokens in the DB using a master `ENCRYPTION_KEY` environment variable.

### LinkedIn Integration
- **OAuth 2.0**: Redirection endpoints handle user login redirects to LinkedIn and callback parameters (code-to-token trade and URN queries).

</decisions>

<canonical_refs>
## Canonical References
- `client/src/components/SettingsPanel.tsx` — Custom settings page component
- `src/controllers/posts.ts` — Main post drafting controller
</canonical_refs>

<specifics>
## Specific Ideas
- Users see a "Connect LinkedIn Account" button in their Settings Panel which opens the OAuth flow. On return, it shows "Connected as [Profile Name]".
- Database holds encrypted keys to guarantee multi-user tenant separation.

</specifics>
