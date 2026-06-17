# Testing Patterns

**Analysis Date:** 2026-06-17

## Test Framework

**Current Status:**
- Automated test runners (e.g. Vitest, Jest) are **not currently configured** in this codebase.
- Development relies on static analysis and manual verification.

**Static Verification Commands:**
```bash
npm run build    # Compiles TypeScript to verify static types
npm run lint     # Runs ESLint to check for stylistic and code quality issues
```

## Manual Verification

**Dry Run Verification:**
1. Configure `.env` setting `DRY_RUN=true`
2. Set a test topic (e.g. `TOPIC="Postgres MVCC locks"`)
3. Execute the agent:
   ```bash
   npm start
   ```
4. Observe the interactive console logs:
   - Verify that Tavily Search query runs successfully.
   - Verify that the Gemini 2.5 Flash model drafts a post.
   - Verify the character length checks and console formatting.
   - Test approval flow by entering `y` or `n`.
   - Confirm that the console outputs `[DRY RUN] Would have published to LinkedIn:` along with the generated content and returns the mock URL.

**Live Verification:**
1. Configure `.env` with live credentials and set `DRY_RUN=false`.
2. Execute `npm start`.
3. Provide interactive approval `y`.
4. Verify the console reports success and yields a valid LinkedIn post URL.

## Future Testing Plan (Recommended)

When adding unit/integration tests to this project, the following conventions should be adopted:

**Framework Recommendation:**
- **Runner:** `Vitest` for lightweight ESM/TypeScript execution.
- **Location:** `src/**/*.test.ts` files collocated with their corresponding modules (e.g. `src/graph/nodes/validatePost.test.ts`).

**Mocking Guidelines:**
- Mock external services using Vitest's `vi.mock` API.
- Specifically mock:
  - `@langchain/google` client calls in service tests.
  - `TavilySearch` instances inside `generatePost.ts`.
  - HTTP network requests (LinkedIn UGC API) inside `linkedin.ts`.

---

*Testing analysis: 2026-06-17*
*Update when test patterns change*
