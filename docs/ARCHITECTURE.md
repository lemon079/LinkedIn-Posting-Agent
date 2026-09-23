<!-- generated-by: gsd-doc-writer -->
# Architecture Overview

## System Overview

Praxis is an event-driven, domain-directed autonomous AI agent studio for LinkedIn content creation and social publishing. Built on **Next.js 16 (App Router)**, **React 19**, **LangGraph (@langchain/langgraph)**, and **Supabase (PostgreSQL & Storage)**, the system takes a high-level topic or technical experience, classifies it into 6 senior practitioner archetypes (including technical Hiring / Recruiting), optionally grounds it with real-time web search facts, generates an authentic post with feed truncation hook engineering and 2026 LinkedIn format compliance, autonomously self-critiques and refines the draft, enforces content safety guardrails, and pauses at a Human-in-the-Loop checkpoint before publishing via the LinkedIn UGC REST API.

The platform employs a Server-Sent Events (SSE) streaming architecture, delivering live chain-of-thought tokens, tool calls, intermediate critique scores, and execution node transitions directly to a responsive assistant UI workspace powered by `@assistant-ui/react`.

---

## Component Diagram

```mermaid
graph TD
    %% Styling
    classDef client fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef api fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef graph fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#f8fafc;
    classDef storage fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ecfdf5;
    classDef external fill:#312e81,stroke:#f59e0b,stroke-width:2px,color:#fef3c7;

    subgraph Client ["Client UI Layer (Next.js 16 & React 19)"]
        UI["Studio Workspace (src/app/page.tsx)"]:::client
        Hooks["State & Stream Hooks (useAgent, useAgentSettings, useAgentMedia)"]:::client
        AssistantUI["Assistant UI & Hook Lab (@assistant-ui/react)"]:::client
        WebSearchElem["WebSearch Component (@assistant-ui/react)"]:::client
        Preview["LinkedIn Feed Preview (LinkedInFeed.tsx)"]:::client
    end

    subgraph Transport ["API Transport Layer (Next.js Route Handlers)"]
        DraftAPI["/api/draft (SSE Stream)"]:::api
        PublishAPI["/api/publish (Resume Graph)"]:::api
        AuthAPI["/api/auth/linkedin (OAuth Callback)"]:::api
        MediaAPI["/api/media/upload (Storage Signed URLs)"]:::api
        UserAPI["/api/user/settings (Encrypted Config)"]:::api
    end

    subgraph LangGraph ["Agent Orchestration Layer (@langchain/langgraph)"]
        Analyze["analyzeIntake Node"]:::graph
        Generate["generateDraft Node"]:::graph
        Critique["critiqueDraft Node"]:::graph
        Refine["refineDraft Node"]:::graph
        Promote["promoteBestDraft Node"]:::graph
        Guardrail["runGuardrails Node"]:::graph
        Validate["validatePost Node"]:::graph
        Interrupt{{"Human-in-the-Loop Checkpoint (interruptBefore: publishPost)"}}:::graph
        Publish["publishPost Node"]:::graph
        ErrorHandler["handleAgentError (Self-Healing Fallback)"]:::graph
    end

    subgraph Persistence ["Persistence & Security Layer (Supabase)"]
        Checkpointer["SupabaseCheckpointer (agent_checkpoints)"]:::storage
        PostDB["User Post History (user_post_history)"]:::storage
        SettingsDB["Encrypted Settings (user_settings)"]:::storage
        CryptoService["AES-256-GCM Crypto (src/modules/auth/crypto.ts)"]:::storage
    end

    subgraph External ["External Services & LLM Providers"]
        LLMs["Multi-Provider LLM Engine (Gemini / Claude / OpenAI / Ollama)"]:::external
        WebSearchService["Tavily Search API (webSearchTool)"]:::external
        LinkedInAPI["LinkedIn UGC API v2"]:::external
    end

    %% Connections
    UI --> Hooks
    Hooks --> AssistantUI
    AssistantUI --> WebSearchElem
    Hooks --> Preview
    Hooks -->|SSE Stream Request| DraftAPI
    Hooks -->|Resume Thread & Post| PublishAPI
    Hooks -->|Upload Media| MediaAPI
    Hooks -->|Sync Settings| UserAPI

    DraftAPI --> Analyze
    Analyze --> Generate
    Generate --> Critique
    Critique -->|Score < 7 & Passes < 2| Refine
    Refine --> Critique
    Critique -->|Score >= 7 or Capped| Promote
    Promote --> Guardrail
    Guardrail --> Validate
    Validate --> Interrupt

    %% Error Recovery
    Analyze -.->|Failure| ErrorHandler
    Generate -.->|Failure| ErrorHandler
    Critique -.->|Failure| ErrorHandler
    Refine -.->|Failure| ErrorHandler
    Guardrail -.->|Failure| ErrorHandler
    Validate -.->|Failure| ErrorHandler
    ErrorHandler -.->|Recovered Draft| Critique
    ErrorHandler -.->|Recovered Intake| Generate

    %% Checkpointing & Resume
    DraftAPI <--> Checkpointer
    Interrupt -.->|Persist State| Checkpointer
    PublishAPI -->|Resume Thread| Publish
    Publish --> Checkpointer
    Publish --> PostDB

    %% External Calls
    Generate <--> LLMs
    Generate <--> WebSearchService
    Critique <--> LLMs
    Refine <--> LLMs
    Publish <--> LinkedInAPI
    UserAPI <--> CryptoService
    CryptoService <--> SettingsDB
```

---

## Data Flow

### 1. Draft Generation Lifecycle (Streaming SSE)
1. **Intake & Trigger:** The user enters a topic, context, archetype (Incident Teardown, Contrarian Take, Playbook, Gotcha Breakdown, Decision Matrix, or Hiring / Recruiting), and tone in `src/components/assistant-ui/composer.tsx` or `src/components/ControlPanel.tsx`. Optionally enables "Ground with web search" toggle.
2. **Request Dispatch:** `useAgent` initiates `POST /api/draft` with prompt payload and execution parameters.
3. **Execution Pipeline:**
   - **`analyzeIntake`**: Extracts core problem domain, target audience angle, and structure requirements. Prevents non-narrative or definitional queries (e.g., "who is a forward deployed engineer?") from being forced into Incident Teardown.
   - **`generateDraft`**:
     - *Web Search Grounding*: If enabled and archetype is eligible (Contrarian, Playbook, Decision Matrix), executes 1-3 targeted queries with a 6s timeout fallback and content guardrails (rephrased, loosely attributed, non-overriding).
     - *Format Compliance*: Enforces 2026 LinkedIn sweet spot (1,300-2,500 chars), bans repetitive emoji bullets, replaces raw URLs with suggested first-comment notes, crafts specific discussion closers, and places hashtags in a dedicated tag.
     - *Multi-Provider Resilience*: Dispatches to primary model with automated failover across genuine providers (Gemini -> OpenAI `gpt-4o-mini` -> Claude `claude-3-5-haiku-latest`) under a tight ~28s primary budget.
   - **`critiqueDraft`**: Evaluates draft across 4 core criteria plus archetype-specific rubrics (e.g. role clarity, concrete requirements, clear CTA for Hiring) and 2026 format checks (flagging repetitive emoji bullets, links in body as hard fail, manufactured contrarian bait).
   - **`refineDraft`**: If score < 7 and critique count < 2, applies concrete surgical improvements.
   - **`promoteBestDraft`**: Selects highest-scoring draft iteration.
   - **`runGuardrails`**: Enforces strict safety standards (no offensive content, no ungrounded metric fabrications) with cross-provider evaluation fallback.
   - **`validatePost`**: Validates character limits (1–3,000 characters).
4. **Checkpoint Interruption:** LangGraph pauses execution immediately before `publishPost` via `interruptBefore: ["publishPost"]`. The checkpoint is persisted to PostgreSQL via `SupabaseCheckpointer`.
5. **Streaming Response:** The client receives SSE events (`node_start`, `token`, `tool_call`, `critique`, `final`) and populates the editor, WebSearch component, and Hook Lab swapper.

### 2. Conversational Refinement & Hook Swapping
1. **Hook Lab Swapper:** Users can audition 3 alternative hook styles (Metric-driven, Contrarian, Incident teardown, or Hiring-specific). Selecting a hook immutably appends a new draft version to the history stack (`v1 · Initial Draft`, `v2`, etc.).
2. **Natural Language Feedback:** Users can type conversational requests ("make it punchier", "shorten to 150 words") into the composer, invoking targeted refinement passes.

### 3. Publishing Lifecycle
1. **Human Confirmation:** User reviews post in the pixel-accurate LinkedIn feed preview and clicks "Publish to LinkedIn".
2. **Resume Thread:** Client calls `POST /api/publish` with `threadId`, optional edited content, and staged image/document attachments.
3. **`publishPost` Execution:**
   - Registers uploaded media binaries with LinkedIn UGC API.
   - Uploads binary payload to LinkedIn upload endpoints.
   - Submits `ugcPosts` payload referencing authenticated member URN.
   - Persists post metadata and hook fingerprints into `user_post_history` for deduplication.
   - Returns live LinkedIn post URL to client.

---

## Key Abstractions

| Abstraction | File Location | Role & Architectural Purpose |
|-------------|---------------|------------------------------|
| **`AgentState`** | [`src/modules/agent/core/state.ts`](file:///d:/Work/linkedin-agent/src/modules/agent/core/state.ts) | Central LangGraph state annotation defining inputs, drafts, critique scores, reasoning traces, web search state, error counters, and credentials. |
| **`SupabaseCheckpointer`** | [`src/modules/agent/checkpointer/supabase.ts`](file:///d:/Work/linkedin-agent/src/modules/agent/checkpointer/supabase.ts) | Custom `BaseCheckpointSaver` implementation serializing and deserializing LangGraph execution threads and writes to Supabase PostgreSQL. |
| **`createModel` (LLMFactory)** | [`src/modules/agent/llm/factory.ts`](file:///d:/Work/linkedin-agent/src/modules/agent/llm/factory.ts) | Unified polymorphic provider factory creating Google Gemini, OpenAI, Anthropic, or Ollama LangChain chat models with cross-provider failover chains. |
| **`webSearchTool` & `performWebSearch`** | [`src/modules/agent/tools/webSearch.ts`](file:///d:/Work/linkedin-agent/src/modules/agent/tools/webSearch.ts) | Backend web search integration with Tavily API, archetype gating, 6s timeout budget, and `{ results: Array<{ title, domain }> }` formatting. |
| **`assistantUiToolkit` & `WebSearch`** | [`src/components/assistant-ui/toolkit.tsx`](file:///d:/Work/linkedin-agent/src/components/assistant-ui/toolkit.tsx), [`src/components/assistant-ui/web-search.tsx`](file:///d:/Work/linkedin-agent/src/components/assistant-ui/web-search.tsx) | `@assistant-ui/react` toolkit integration using `externalTool()` to render stream-safe query badges, searching spinners, and domain result chips. |
| **`withDeadline`** | [`src/modules/agent/llm/timeout.ts`](file:///d:/Work/linkedin-agent/src/modules/agent/llm/timeout.ts) | Deadline-aware wrapper wrapping model invocations with timeout abort controllers and execution timers. |
| **`CryptoService`** | [`src/modules/auth/crypto.ts`](file:///d:/Work/linkedin-agent/src/modules/auth/crypto.ts) | Cryptographic security layer handling AES-256-GCM authenticated encryption and decryption for sensitive API keys and OAuth tokens. |
| **`LinkedInPublisher`** | [`src/modules/linkedin/publisher.ts`](file:///d:/Work/linkedin-agent/src/modules/linkedin/publisher.ts) | High-level LinkedIn API client orchestrating UGC image/document asset registration, upload chunking, and post creation. |
| **`useAgent`** | [`src/hooks/useAgent.ts`](file:///d:/Work/linkedin-agent/src/hooks/useAgent.ts) | Comprehensive React state orchestrator managing SSE streaming, draft version history stack, Hook Lab integration, and publishing flows. |

---

## Directory Structure Rationale

The project strictly follows a domain-driven modular structure isolating feature domains from platform infrastructure:

```
src/
├── app/               # Next.js 16 App Router (pages and API route handlers)
│   ├── api/           # HTTP API endpoints (/draft, /publish, /auth, /user, /media, /health-check)
│   ├── layout.tsx     # Root application layout with ThemeProvider and Assistant-UI runtime
│   └── page.tsx       # Main desktop & mobile studio interface
├── components/        # Reusable presentation components
│   ├── assistant-ui/  # Assistant UI thread, composer, message list, and ErrorState integration
│   ├── layout/        # Header and global layout wrappers
│   ├── ui/            # Radix UI primitives and utility widgets
│   ├── ControlPanel.tsx # Input configuration, archetype selectors, and media staging
│   ├── EditorPanel.tsx  # Draft editing, character counting, versioning dropdown, and publish action
│   └── LinkedInFeed.tsx # Pixel-perfect LinkedIn feed post simulation and responsive image mosaic
├── config/            # Environment validation (env.ts) and database DDL schemas (schema.sql)
├── hooks/             # Encapsulated state management hooks (useAgent, useAgentSettings, useAgentMedia)
├── lib/               # Shared cross-cutting infrastructure (Supabase clients, structured JSON logger, utils)
├── modules/           # Domain-driven business logic modules
│   ├── agent/         # LangGraph state machine, nodes, prompts, checkpointers, LLM factory
│   ├── auth/          # AES-256-GCM crypto, OAuth callbacks, and token exchange
│   ├── linkedin/      # LinkedIn UGC REST API client and token managers
│   ├── media/         # File staging, presigned URLs, and Supabase storage
│   └── user/          # User settings persistence, post history, and deduplication
├── tests/             # Comprehensive Jest unit, integration, UI, and regression test suites
└── types/             # Shared TypeScript schemas, database definitions, and SSE stream contracts
```
