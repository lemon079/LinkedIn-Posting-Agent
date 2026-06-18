# Phase 1: API Server & LangGraph REST integration - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the backend HTTP server infrastructure. It wraps the existing LangGraph daily posting agent execution loop inside Express-based REST API endpoints to allow triggering drafts, reviewing the generated text, updating the draft with client edits, and finalizing the LinkedIn publication.

</domain>

<decisions>
## Implementation Decisions

### API Route Design
- **D-01:** Implement flat HTTP endpoints mapping directly to the state machine actions:
  - `GET /api/topics` - Returns default genres/topics.
  - `POST /api/draft` - Trigger draft generation. Starts the graph run and halts at `publishPost` breakpoint. Returns `{ threadId, draft }`.
  - `POST /api/publish` - Resumes execution with client-side text changes. Returns `{ postUrl }`.

### Server Configuration
- **D-02:** Run Express API server on default port `3000`.
- **D-03:** Integrate `cors` middleware configured in development to allow requests exclusively from default Vite server `http://localhost:5173`.

### the agent's Discretion
- Express endpoint error formats and body validation libraries.
- Server boot scripts and console startup log designs.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specifications & Roadmap
- `.planning/PROJECT.md` — Core values, Active requirements, Out of scope items
- `.planning/REQUIREMENTS.md` — Detailed v1/v2 definitions (`API-01`, `API-02`, `API-03`)
- `.planning/ROADMAP.md` — Project roadmap and Phase 1 objectives
- `.planning/research/SUMMARY.md` — Web dashboard architectural findings and gotchas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/graph/index.ts` — Contains the compiled LangGraph `agent` with `MemorySaver` and `interruptBefore: ["publishPost"]` configuration.
- `src/services/llm.ts` — Instantiation wrapper `createLLM()` for Gemini 2.5 Flash.
- `src/services/linkedin.ts` — Wrap publishing HTTP call in `publishLinkedInPost()`. Supports `DRY_RUN` logging mode.
- `src/config/env.ts` — Startup environment validation.

### Established Patterns
- **NodeNext Resolution:** Relative file imports must end in `.js` (e.g. `import { agent } from "./graph/index.js"`).
- **Graceful Error Catching:** Graph nodes catch API failures inside `try/catch` and output them to `state.error` to terminate execution without process crashes.
- **Fail-Fast Boot:** Missing `.env` configurations throw synchronous hard errors during application bootstrap.

### Integration Points
- Create new entry point `src/server.ts` to boot Express.
- Add run script in `package.json` to boot the API server.

</code_context>

<specifics>
## Specific Ideas

- Ensure `POST /api/publish` accepts an updated `postContent` parameter and calls `agent.updateState(threadConfig, { postContent })` prior to resuming the thread, guaranteeing client edits are committed.

</specifics>

<deferred>
## Deferred Ideas

- SQLite-backed graph checkpointing (`SqliteSaver`) - Deferred for MVP. In-memory `MemorySaver` is used, meaning active threads clear if the Express server restarts.
- Webpage routing or static files serving - Frontend hosting configurations are deferred to Phase 2.

</deferred>

---
*Phase: 01-api-server-langgraph-rest-integration*
*Context gathered: 2026-06-18*
