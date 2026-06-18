# Context: Professionally Organize the Codebase

This document captures the discussion, assumptions, and design decisions for refactoring the codebase to comply with the 80-line file length coding rule and establish professional code organization.

## Current Concerns

1. **`src/server.ts` is 115 lines long**: Exceeds the 80-line limit. It mixes Express server startup, CORS setup, routing, and controller logic for the three API endpoints.
2. **`src/scheduler.ts` is 101 lines long**: Exceeds the 80-line limit. It mixes CLI argument parsing, interactive terminal questions (`readline`), random topic generation, and the scheduled/cron runner logic.

---

## Proposed Refactoring Architecture

To maintain high professional standards and guarantee all files stay under the 80-line limit, we propose the following changes:

### 1. Server Decomposition
- **`src/server.ts`** (Keep under 30 lines): Focus solely on Express app initialization, CORS middleware setup, registering routes, and starting the server listener.
- **`src/routes/posts.ts`** [NEW] (Keep under 30 lines): Declare the router and map routes to their respective controllers.
- **`src/controllers/posts.ts`** [NEW] (Keep under 75 lines): Contain the actual route handler logic for `GET /api/topics`, `POST /api/draft`, and `POST /api/publish`.

### 2. Scheduler Decomposition
- **`src/scheduler.ts`** (Keep under 50 lines): Focus on CLI entry-point argument parsing, Cron setup (`node-cron`), and executing the main agent loop.
- **`src/core/utils.ts`** [NEW] (Keep under 50 lines): Move the CLI interactive helpers (`askQuestion`) and CLI topic selector (`getTopic`) into this helper file.

---

## Open Questions / Review Required

> [!NOTE]
> All relative imports in TypeScript must end with `.js` to satisfy the codebase's `NodeNext` ESM conventions (e.g. `import { postsRouter } from "./routes/posts.js";`).

Do you agree with this proposed modular structure for the refactoring?
