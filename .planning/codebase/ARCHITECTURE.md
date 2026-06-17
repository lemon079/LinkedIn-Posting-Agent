# Architecture

**Analysis Date:** 2026-06-17

## Pattern Overview

**Overall:** Stateful Graph Agent (LangGraph) with Human-in-the-Loop Intervention and Cron Scheduling.

**Key Characteristics:**
- **Stateful Execution:** LangGraph manages the state transitions and checkpointing.
- **Human-in-the-loop (HITL):** Execution breaks before publishing, allowing interactive command-line review and approval of drafts.
- **Agentic Generation:** Leverages a React agent wrapper with internet search tools to write grounded technical posts.
- **Stateless Storage:** No databases or persistent storage files; checkpointer runs entirely in memory (`MemorySaver`).

## Layers

**Scheduler / Entry Layer:**
- Purpose: Execute or schedule the agent, manage input parameters, and prompt users for post approval.
- Contains: `src/scheduler.ts`
- Depends on: Graph layer (`src/graph/index.ts`) for invocation and `src/config/env.ts` for configuration.

**Graph / Orchestration Layer:**
- Purpose: Set up state schema, node execution order, conditional branches, and breakpoint configuration.
- Contains: `src/graph/index.ts`, `src/core/state.ts`
- Depends on: Node functions, state annotations.
- Used by: Scheduler layer.

**Node Layer:**
- Purpose: Individual steps in the agent's workflow.
- Contains: `src/graph/nodes/generatePost.ts`, `src/graph/nodes/validatePost.ts`, `src/graph/nodes/publishPost.ts`
- Depends on: Service layer for external APIs, core constants.
- Used by: Graph builder.

**Service Layer:**
- Purpose: Communication wrappers for external services and LLMs.
- Contains: `src/services/llm.ts` (Gemini instantiation), `src/services/linkedin.ts` (REST client)
- Depends on: Config layer.
- Used by: Node functions.

**Config Layer:**
- Purpose: Load environment variables and halt application startup if required configs are missing.
- Contains: `src/config/env.ts`

## Data Flow

**Interactive Posting Flow:**
```
[User runs agent/cron triggers]
       │
       ▼
[src/scheduler.ts] -> Loads topic/genre and context
       │
       ▼
[agent.invoke()] -> starts graph execution
       │
       ▼
[generatePost] -> React agent uses TavilySearch & Gemini to draft post
       │
       ▼
[validatePost] -> Asserts length <= 3000 and non-empty
       │
 ┌─────┴───────────┐
 │ (invalid &      │ (valid)
 │ retries < 2)    ▼
 │                 [Graph Pauses (interruptBefore: publishPost)]
 │                 - Control returned to src/scheduler.ts
 │                 - Displays draft to user
 │                 - User replies 'y' (approve)
 │                 │
 └─►[generatePost] │
                   ▼
                   [agent.invoke(null)] -> Resumes graph
                   │
                   ▼
                   [publishPost] -> POSTs to LinkedIn ugcPosts API
                   │
                   ▼
                   [END] -> Final post URL printed
```

**State Management:**
- In-memory state tracking is handled by `@langchain/langgraph`'s `MemorySaver`.
- Interactive session approval is mapped using a unique `thread_id` generated via `Date.now().toString()`.

## Key Abstractions

**AgentState:**
- State shape containing: `topic`, `context`, `postContent` (draft), `postUrl` (final post link), `retries`, and `error`.
- File: `src/core/state.ts`

**React Agent (Generation Node):**
- Dynamic sub-graph executor created via `@langchain/langgraph/prebuilt`'s `createReactAgent` in `generatePost`. Uses Gemini `ChatGoogle` and `TavilySearch` tool.

## Entry Points

**Interactive/Scheduled CLI Node CLI:**
- Location: `src/scheduler.ts`
- Triggers: User execution (`npm start` or `npx tsx src/scheduler.ts`) or Scheduled run (`npm start -- --schedule`)
- Responsibilities: Parses command args, triggers scheduler, runs readline console interface, invokes LangGraph.

## Error Handling

- **Startup validation:** Strict checking in `src/config/env.ts` throws errors immediately if keys are missing.
- **Node exceptions:** All logic in `generatePost` and `publishPost` runs inside try/catch blocks. Any caught error is mapped into `state.error` to terminate execution gracefully without throwing unhandled exceptions.

## Cross-Cutting Concerns

**Search Engine Integration:**
- Grounding via `TavilySearch` within `generatePost` node.

**Dry Run Mode:**
- Controlled via `DRY_RUN` env var in `src/services/linkedin.ts` to mock out writing to the live API.

---

*Architecture analysis: 2026-06-17*
*Update when major patterns change*
