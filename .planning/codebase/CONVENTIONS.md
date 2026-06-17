# Coding Conventions

**Analysis Date:** 2026-06-17

## Naming Patterns

**Files:**
- camelCase for TypeScript modules (e.g., `generatePost.ts`, `env.ts`).
- `.js` extension used in relative imports (e.g., `import { agent } from "./graph/index.js"`).

**Functions:**
- camelCase for all functions (e.g., `runAgent`, `publishLinkedInPost`, `createLLM`).

**Variables:**
- camelCase for local variables (e.g., `randomGenre`, `generatedDraft`).
- PascalCase for Graph states (e.g., `AgentState`).
- UPPER_SNAKE_CASE for config/prompt constants (e.g., `SYSTEM_PROMPT`).

**Types:**
- PascalCase for interfaces (e.g., `AppConfig`, `PublishPostResponse`).
- PascalCase for types (e.g., `State`).

## Code Style

**Formatting:**
- 2-space indentation.
- Semicolons are required.
- Double quotes or single quotes are used for string literals.

**Linting:**
- ESLint via `eslint.config.js`.
- Configured rules:
  - `@typescript-eslint/no-unused-vars`: Error unless prefixed with `_`.
  - `@typescript-eslint/no-explicit-any`: Warn.
- Lint execution command: `npm run lint`.

## Import Organization

**Order:**
1. External npm packages (e.g. `import cron from "node-cron";`).
2. Internal absolute/relative imports referencing built `.js` modules (e.g. `import { AgentState } from "../core/state.js";`).

**ESM Requirements:**
- Every relative file import MUST end with `.js` instead of `.ts` (e.g. `import { createLLM } from "../../services/llm.js";`). This is strictly required for `NodeNext` resolution compatibility.

## Error Handling

**Core Strategy:**
- Critical validation checks (e.g., in `src/config/env.ts`) throw hard errors immediately during boot to fail fast.
- Async graph nodes wrap external API calls (Gemini, LinkedIn, Tavily) in `try/catch` blocks.
- Exceptions caught in node execution are logged and mapped into `state.error` properties instead of throwing up to the parent process, allowing graceful graph termination.

## Logging

- Direct usage of `console.log` and `console.error` for output.
- No heavy external logging frameworks (e.g. winston or pino).
- Terminal printing uses explicit headers/delimiters to format the draft view for review.

## Function & Module Design

- **Named Exports Only:** Avoid using default exports to ensure import consistency and easier code traversal.
- **Early Returns:** Implement early returns for guard clauses or error checks.
- **No `any` Types:** Strong typing is enforced across interfaces and state structures.

---

*Convention analysis: 2026-06-17*
*Update when patterns change*
