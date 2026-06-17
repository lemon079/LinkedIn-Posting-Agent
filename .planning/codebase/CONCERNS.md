# Codebase Concerns

**Analysis Date:** 2026-06-17

## Tech Debt

**Inconsistent LLM Import Directives:**
- Issue: `agent/INSTRUCTIONS.md` (line 107) prescribes importing `ChatGoogle` from `@langchain/google/node`. However, `src/services/llm.ts` imports from `@langchain/google` directly.
- Files: `agent/INSTRUCTIONS.md`, `src/services/llm.ts`
- Why: Outdated instruction files or evolution in the `@langchain/google` package version.
- Impact: Potential confusion for new development or automated code generation.
- Fix approach: Update `agent/INSTRUCTIONS.md` to match the active code conventions, as direct import from `@langchain/google` is correct for current package versions.

**Lack of Startup Env Check for Tavily Key:**
- Issue: `TAVILY_API_KEY` is required by the `TavilySearch` tool instantiated in `generatePost.ts`, but it is not validated on boot in `src/config/env.ts`.
- Files: `src/config/env.ts`, `src/graph/nodes/generatePost.ts`
- Why: Tavily was integrated later (as noted in `agent/PROGRESS.md`) without updating the strict startup validations.
- Impact: The agent fails mid-run during the LLM node generation loop if the key is missing, rather than failing immediately at boot.
- Fix approach: Add `TAVILY_API_KEY` to `AppConfig` validation checks in `src/config/env.ts`.

## Security Considerations

**Static LinkedIn Credentials in Env:**
- Risk: Long-lived member access tokens are stored directly in plain text within `.env`. If this file is accidentally committed or leaked, anyone can post on behalf of the user.
- Files: `.env`, `src/config/env.ts`
- Current mitigation: `.env` is listed in `.gitignore`.
- Recommendations: Keep access tokens in a secure secret store (e.g., Vault or environment secrets manager) in production environments.

## Performance Bottlenecks

**Serial Readline Blocking in Scheduler:**
- Problem: The interactive readline prompt blocks the scheduler execution thread.
- Files: `src/scheduler.ts` (line 72)
- Impact: In interactive mode, the script remains alive and blocking memory indefinitely until the user inputs `y` or `n`.
- Fix approach: Fine for CLI tools, but in production servers this should transition to Webhooks or Slack approval triggers instead of CLI inputs.

## Fragile Areas

**In-Memory Checkpoint Storage (`MemorySaver`):**
- Why fragile: The graph is configured to interrupt before `publishPost`. The interactive confirmation reads from `MemorySaver` checkpointer.
- Files: `src/graph/index.ts` (line 30), `src/scheduler.ts`
- Impact: If the Node.js process is restarted, killed, or crashes while waiting for human CLI input, the draft state is lost completely since `MemorySaver` keeps checkpoints in memory. The user has to trigger a brand-new run.
- Fix approach: Implement a database-backed checkpointer (e.g., SqliteSaver or PostgresSaver) if persistence across runs is required.

## Scaling Limits

**LinkedIn Access Token Lifecycle:**
- Current capacity: Member tokens expire every 60 days.
- Limit: 60-day window.
- Symptoms at limit: Requests to UGC API fail with `401 Unauthorized` errors.
- Scaling path: Transition from manual member tokens to a proper OAuth 2.0 Authorization Server with automatic client Refresh Token flows.

**Single-Threaded Cron Process:**
- Current capacity: Executed in-process using `node-cron`.
- Limit: Susceptible to server downtime, crashes, or memory leaks.
- Symptoms at limit: Silent failure of scheduled posts.
- Scaling path: Prefer system-level cron jobs (Option A in `agent/PROJECT.md`) or cloud-scheduler triggers invoking a serverless function.

## Test Coverage Gaps

**No Automated Verification Suite:**
- What's not tested: Entire graph node flow, Tavily searches, API payloads, character limits, error captures.
- Risk: Structural regression (e.g. breaking relative `.js` import paths or payload shapes) can only be detected at runtime by dry-running or publishing live.
- Priority: High
- Difficulty to test: Low. Can be quickly covered by setting up Vitest.

---

*Concerns audit: 2026-06-17*
*Update as issues are fixed or new ones discovered*
