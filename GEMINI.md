<!-- GSD:project-start source:PROJECT.md -->
## Project

**LinkedIn Daily Posting Agent**

A stateful LangGraph agent that automates drafting, searching, validating, and publishing technical LinkedIn posts. It provides a visual web dashboard to allow users to trigger posts on-demand, choose topics, customize context, edit draft copy in a rich text editor, and publish immediately, while supporting high-fidelity LinkedIn styles.

**Core Value:** Empower the user to draft and publish high-quality, technically accurate, and styled LinkedIn posts on-demand or on a schedule with complete manual editing control.

### Constraints

- **Tech Stack**: Must extend the existing Node.js/TypeScript and LangGraph codebase.
- **Dependencies**: Restrict front-end tooling to standard React, Vite, and Vanilla CSS. No tailwind unless explicitly required.
- **API Limits**: The LinkedIn member access token is static and expires every 60 days.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 - All application code
- JavaScript - Configuration files (`eslint.config.js`)
## Runtime
- Node.js 20.x
- No browser runtime (CLI/cron scheduler only)
- npm 10.x
- Lockfile: `package-lock.json` present
## Frameworks
- None (vanilla Node.js app using `@langchain/langgraph` for orchestration)
- None (no test framework configured)
- tsx 4.x - For running TypeScript source directly without manual build step
- typescript 5.9.3 - TypeScript compiler (`tsc`)
## Key Dependencies
- `@langchain/langgraph` v1.3.2 - Stateful agent graph framework
- `@langchain/google` v0.1.12 - Google Gemini model integration
- `@langchain/tavily` v1.2.0 - Tavily Search API client for web search during post drafting
- `@google/generative-ai` v0.24.1 - Underlying Google generative AI SDK
- `@langchain/core` v1.1.48 - LangChain abstractions and messages
- `node-cron` v3.0.0 - Daily cron scheduler
- `dotenv` v16.0.0 - Loads configuration from `.env` file
## Configuration
- Configured via `.env` file containing secrets and configuration options
- Key vars: `GOOGLE_API_KEY`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN`, `TOPIC`, `CONTEXT`, `TAVILY_API_KEY`, `DRY_RUN`
- `tsconfig.json` - TypeScript compilation and module resolution options (`NodeNext`)
- `eslint.config.js` - ESLint configuration
## Platform Requirements
- Windows/macOS/Linux with Node.js 20+ installed
- API keys for Google Gemini, LinkedIn REST API, and Tavily Search (optional)
- Standard server/VM or container running Node.js 20+
- Running as a persistent process (`node src/scheduler.ts --schedule`) or invoked via system cron (`tsx src/scheduler.ts`)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- camelCase for TypeScript modules (e.g., `generatePost.ts`, `env.ts`).
- `.js` extension used in relative imports (e.g., `import { agent } from "./graph/index.js"`).
- camelCase for all functions (e.g., `runAgent`, `publishLinkedInPost`, `createLLM`).
- camelCase for local variables (e.g., `randomGenre`, `generatedDraft`).
- PascalCase for Graph states (e.g., `AgentState`).
- UPPER_SNAKE_CASE for config/prompt constants (e.g., `SYSTEM_PROMPT`).
- PascalCase for interfaces (e.g., `AppConfig`, `PublishPostResponse`).
- PascalCase for types (e.g., `State`).
## Code Style
- 2-space indentation.
- Semicolons are required.
- Double quotes or single quotes are used for string literals.
- ESLint via `eslint.config.js`.
- Configured rules:
- Lint execution command: `npm run lint`.
## Import Organization
- Every relative file import MUST end with `.js` instead of `.ts` (e.g. `import { createLLM } from "../../services/llm.js";`). This is strictly required for `NodeNext` resolution compatibility.
## Error Handling
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
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Stateful Execution:** LangGraph manages the state transitions and checkpointing.
- **Human-in-the-loop (HITL):** Execution breaks before publishing, allowing interactive command-line review and approval of drafts.
- **Agentic Generation:** Leverages a React agent wrapper with internet search tools to write grounded technical posts.
- **Stateless Storage:** No databases or persistent storage files; checkpointer runs entirely in memory (`MemorySaver`).
## Layers
- Purpose: Execute or schedule the agent, manage input parameters, and prompt users for post approval.
- Contains: `src/scheduler.ts`
- Depends on: Graph layer (`src/graph/index.ts`) for invocation and `src/config/env.ts` for configuration.
- Purpose: Set up state schema, node execution order, conditional branches, and breakpoint configuration.
- Contains: `src/graph/index.ts`, `src/core/state.ts`
- Depends on: Node functions, state annotations.
- Used by: Scheduler layer.
- Purpose: Individual steps in the agent's workflow.
- Contains: `src/graph/nodes/generatePost.ts`, `src/graph/nodes/validatePost.ts`, `src/graph/nodes/publishPost.ts`
- Depends on: Service layer for external APIs, core constants.
- Used by: Graph builder.
- Purpose: Communication wrappers for external services and LLMs.
- Contains: `src/services/llm.ts` (Gemini instantiation), `src/services/linkedin.ts` (REST client)
- Depends on: Config layer.
- Used by: Node functions.
- Purpose: Load environment variables and halt application startup if required configs are missing.
- Contains: `src/config/env.ts`
## Data Flow
```
```
- In-memory state tracking is handled by `@langchain/langgraph`'s `MemorySaver`.
- Interactive session approval is mapped using a unique `thread_id` generated via `Date.now().toString()`.
## Key Abstractions
- State shape containing: `topic`, `context`, `postContent` (draft), `postUrl` (final post link), `retries`, and `error`.
- File: `src/core/state.ts`
- Dynamic sub-graph executor created via `@langchain/langgraph/prebuilt`'s `createReactAgent` in `generatePost`. Uses Gemini `ChatGoogle` and `TavilySearch` tool.
## Entry Points
- Location: `src/scheduler.ts`
- Triggers: User execution (`npm start` or `npx tsx src/scheduler.ts`) or Scheduled run (`npm start -- --schedule`)
- Responsibilities: Parses command args, triggers scheduler, runs readline console interface, invokes LangGraph.
## Error Handling
- **Startup validation:** Strict checking in `src/config/env.ts` throws errors immediately if keys are missing.
- **Node exceptions:** All logic in `generatePost` and `publishPost` runs inside try/catch blocks. Any caught error is mapped into `state.error` to terminate execution gracefully without throwing unhandled exceptions.
## Cross-Cutting Concerns
- Grounding via `TavilySearch` within `generatePost` node.
- Controlled via `DRY_RUN` env var in `src/services/linkedin.ts` to mock out writing to the live API.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
