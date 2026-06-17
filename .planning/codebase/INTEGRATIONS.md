# External Integrations

**Analysis Date:** 2026-06-17

## APIs & External Services

**Gemini LLM API:**
- Service: Google Gemini API (model `gemini-2.5-flash`) for post drafting
  - SDK/Client: `@langchain/google` (using `ChatGoogle`)
  - Auth: API key in `GOOGLE_API_KEY` env var
  - Usage: Invoked within `src/graph/nodes/generatePost.ts` via helper in `src/services/llm.ts`

**LinkedIn API:**
- Service: LinkedIn REST API (`ugcPosts` endpoint) for post publishing
  - SDK/Client: Direct HTTPS `fetch` calls in `src/services/linkedin.ts`
  - Auth: OAuth 2.0 Bearer token in `LINKEDIN_ACCESS_TOKEN` env var; URN identifier in `LINKEDIN_PERSON_URN`
  - Endpoints used: POST `https://api.linkedin.com/v2/ugcPosts`
  - Dry Run: If `DRY_RUN` env var is "true", prints to console instead of posting and returns a mock URL

**Tavily Search API:**
- Service: Tavily Search API for fetching current facts
  - SDK/Client: `@langchain/tavily` (using `TavilySearch`)
  - Auth: API key in `TAVILY_API_KEY` env var (implicitly loaded by Tavily sdk)
  - Usage: Tool inside the React agent in `src/graph/nodes/generatePost.ts`

## Data Storage

**Databases & Caching:**
- None. The application is stateless and runs per-execution.

**Agent State / Checkpoint Storage:**
- Framework-level: In-memory checkpointing via `MemorySaver` from `@langchain/langgraph`
  - Location: `src/graph/index.ts`
  - Purpose: Persist agent state during the Human-in-the-loop breakpoint (before `publishPost`) to allow interactive CLI approval.

## Authentication & Identity

**OAuth Integrations:**
- LinkedIn OAuth 2.0: Requires manual authorization code flow to obtain a long-lived member access token (valid 60 days). Token and Person URN are set in `.env`.

## CI/CD & Deployment

- None. Running locally or as a system cron job.

## Environment Configuration

**Required Environment Variables:**
- `GOOGLE_API_KEY` - Gemini API key
- `LINKEDIN_ACCESS_TOKEN` - LinkedIn member token
- `LINKEDIN_PERSON_URN` - LinkedIn user identification URN (e.g. `urn:li:person:XXXX`)

**Optional Environment Variables:**
- `TOPIC` - Specific topic to post about. If absent, `src/scheduler.ts` picks a random genre.
- `CONTEXT` - Guidelines, constraints, or background info appended to user prompt.
- `TAVILY_API_KEY` - Tavily search engine API key.
- `DRY_RUN` - If set to `true`, disables actual LinkedIn posting.

---

*Integration audit: 2026-06-17*
*Update when adding/removing external services*
