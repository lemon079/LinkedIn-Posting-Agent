# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-06-23
**Phases:** 4 | **Plans:** 6 | **Sessions:** 1

### What Was Built
- **REST API Route Handlers:** Implemented Next.js route handlers exposing `/api/topics`, `/api/draft`, `/api/publish`, `/api/user/settings`, and `/api/health-check` endpoints.
- **Vite React Web Dashboard:** Built responsive control panels, settings panels, high-fidelity LinkedIn feed cards, and live editors with character warnings.
- **Few-Shot Optimization:** Dynamic inclusion of technical templates in the LLM ghostwriter system prompt.
- **Supabase Authentication & Settings DB:** Integrated Supabase JWT email auth and AES-256-GCM symmetric encryption for settings storage.

### What Worked
- **Centralized Types Module:** Consolidating interfaces into `src/types/index.ts` simplified types resolution and import structures across Next.js API routes and React hooks.
- **Client Fallback Logic:** Storing credentials in browser LocalStorage as fallback when Supabase is not active keeps dashboard fully functional.

### What Was Inefficient
- **Plan File Overlap:** Retaining old aborted/duplicate plan directories in `.planning/quick` created minor confusion during codebase analysis.

### Patterns Established
- Central typescript types module for ESM Next.js integrations.
- Local fallback browser storage when Supabase server auth is inactive.

### Key Lessons
1. Transitioning Express backends to Next.js route handlers early simplifies deployment and reduces backend server overhead.
2. Mocking third-party API results in tests using `as Response` or `as never` avoids triggering strict `no-explicit-any` ESLint rules.

### Cost Observations
- Model mix: 100% Gemini 3.5 Flash
- Cumulative quality: 12 passing tests, 0 linter errors.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 4 | Initial MVP development and Supabase multi-user auth integration. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 12 | 100% | 0 |
