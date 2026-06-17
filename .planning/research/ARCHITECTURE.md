# Architecture Research

**Domain:** Social Media Automation Dashboard (Web Triggered Agent)
**Researched:** 2026-06-17
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Web Dashboard                         │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│   │ TopicSelect  │   │ CustomInput  │   │ DraftEditor  │    │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│          │                  │                  │            │
├──────────┼──────────────────┼──────────────────┼────────────┤
│          ▼                  ▼                  ▼            │
│                       Express API                           │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│   │  /api/topics │   │  /api/draft  │   │ /api/publish │    │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│          │                  │                  │            │
├──────────┼──────────────────┼──────────────────┼────────────┤
│          ▼                  ▼                  ▼            │
│                  LangGraph Orchestration                    │
│   ┌────────────────────────────────────────────────────┐    │
│   │ MemorySaver (In-Memory Checkpoint Store)           │    │
│   └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| React Client | UI presentations, inputs validation, draft editing, character count. | SPA React (Vite-bundled) using Vanilla CSS. |
| Express Server | Hosts API endpoints, serves static assets in production, boots cron processes. | Express app running in TS Node environment. |
| LangGraph Workflow | Manages post drafting execution steps (generate -> validate -> interrupt). | Stateful graph instance compiled with `MemorySaver`. |
| LinkedIn Client | Sends formatted ugcPosts payload to LinkedIn OAuth endpoint. | HTTPS `fetch` request client with Bearer Authorization headers. |

## Recommended Project Structure

```
linkedin-agent/
├── client/                 # React frontend client application
│   ├── index.html          # Web entry point
│   ├── vite.config.ts      # Vite bundler options
│   └── src/
│       ├── main.tsx        # React mounting script
│       ├── App.tsx         # Dashboard layout and state controller
│       ├── components/     # UI elements (editor, topic selector)
│       └── App.css         # Styling system
├── src/                    # Existing backend codebase
│   ├── config/             # Config loader
│   ├── core/               # Prompts & states
│   ├── graph/              # LangGraph compilation & nodes
│   ├── services/           # LLM and LinkedIn wrapper services
│   ├── scheduler.ts        # CLI Cron schedule entry point
│   └── server.ts           # Express HTTP server
```

### Structure Rationale

- **client/**: Keeping the React application in an isolated root folder avoids cluttering the backend source folder. It allows Vite to compile assets cleanly and independent of Backend ESM imports.
- **src/server.ts**: Serves as the main gateway when running in web server mode, while keeping `src/scheduler.ts` focused purely on cron triggers.

## Architectural Patterns

### Pattern: Interrupt-Resume REST Control

**What:** Exposes REST API endpoints that correspond directly to LangGraph states. The server runs the graph, halts at the interrupt breakpoint, caches the state in memory using the checkpointer, and returns the draft. Once approved, a second REST call resumes the graph execution by passing a thread reference.

**Example:**
```typescript
// Express REST Controller to trigger draft
app.post("/api/draft", async (req, res) => {
  const { topic, context } = req.body;
  const threadId = Date.now().toString();
  const threadConfig = { configurable: { thread_id: threadId } };
  
  // Start graph - will stop before publishPost due to interruptBefore
  await agent.invoke({ topic, context }, threadConfig);
  
  const state = await agent.getState(threadConfig);
  res.json({
    threadId,
    draft: state.values.postContent,
    status: state.next[0] === "publishPost" ? "needs_approval" : "failed"
  });
});
```

## Data Flow

### Request Flow

```
[Dashboard Input]
      ↓
[POST /api/draft] → [Express API] → [agent.invoke(topic)] → [Tavily/Gemini Node]
      ↓                                                                 │
[State Interrupt] ← [Return JSON Draft] ◄── [State Paused at Node] ◄─────┘
      ↓
[Draft Edits in UI]
      ↓
[POST /api/publish] → [Express API] → [Update Graph State Content]
      ↓                                           │
[Response Success] ◄── [LinkedIn API Success] ◄───┴── [agent.invoke(null)] (Resume)
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user (Current) | In-process memory checkpointer (`MemorySaver`) is perfect and fast. |
| 10+ users | Must migrate `MemorySaver` to a database-backed checkpointer (e.g., `SqliteSaver` or `PostgresSaver`) to prevent draft states from being lost when the server restarts or crashes. |

## Anti-Patterns

### Anti-Pattern: Direct Client API Invocation
**What people do:** Attempt to call LinkedIn API or Gemini API directly from the React client.
**Why it's wrong:** Exposes highly sensitive credentials (`GOOGLE_API_KEY`, `LINKEDIN_ACCESS_TOKEN`) to the browser, risking key compromises.
**Do this instead:** Keep all credentials on the Express server and invoke external APIs only through server-side graph nodes.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Gemini API | LangChain ChatGoogle | Kept server-side, uses system messages automatically. |
| LinkedIn API | Direct REST API calls | UGC post endpoint. |
| Tavily API | TavilySearch tool | Registered as a tool in the React agent. |

---
*Architecture research for: Social Media Automation Dashboard*
*Researched: 2026-06-17*
