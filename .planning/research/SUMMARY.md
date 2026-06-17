# Project Research Summary

**Project:** LinkedIn Daily Posting Agent
**Domain:** Social Media Automation Dashboard (Web Triggered Agent)
**Researched:** 2026-06-17
**Confidence:** HIGH

## Executive Summary

This project involves extending an existing command-line based LinkedIn daily posting agent built with LangGraph, Tavily Search, and Gemini 2.5 Flash into a web-enabled application. To enable triggering and reviewing posts on-demand—specifically from mobile and desktop browsers—we researched a client-server architecture consisting of an Express API backend and a Vite-bundled React frontend client.

Research indicates that embedding Express directly into our current TypeScript/NodeNext module structure provides a highly modular and low-overhead integration. It enables loading active graph states, handling breakpoints during human-in-the-loop (HITL) confirmations, and serving built frontend assets dynamically. The React frontend provides the ideal container for building interactive elements like textareas with character length monitoring and immediate posting triggers.

Key risks center around synchronizing client-side draft edits back to the in-memory agent checkpointer (`MemorySaver`) before final publication, and configuration bugs related to CORS in local development. These have been accounted for in the recommended phase design.

## Key Findings

### Recommended Stack

- **Backend:** Express API server using Node.js 20+ and TypeScript (`module: NodeNext`).
- **Frontend:** React (SPA framework) and Vite (dev and build bundler) with Vanilla CSS.
- **Agent Orchestrator:** LangGraph JS compiled with `MemorySaver` in-memory checkpointing.
- **LLM / Search APIs:** ChatGoogle (Gemini 2.5 Flash) and Tavily Search tool.

### Expected Features

**Must have (table stakes):**
- **Topic Selection:** Dropdown UI containing default genres.
- **Custom Topic Input:** Form text fields for custom topics and optional contexts.
- **Live Draft Editor:** Textarea letting the user modify generated drafts before sending.
- **Publish Trigger:** Resumes the graph flow and publishes the edited draft to LinkedIn.
- **Dry Run Flag:** Checkbox toggling dry-run mode.

**Should have (differentiators):**
- **Character Counter:** Responsive warning if input exceeds 3000 characters.
- **Few-Shot Ghostwriter:** Prompt optimizations leveraging real high-quality post examples.
- **Premium CSS Aesthetics:** Glassmorphic layout with responsive dark mode styling.

**Defer (v2+):**
- **Native iOS/Android App:** Replaced by mobile-responsive web browser access to save build-time overhead.
- **User Authentication:** Single-user mode config remains default.

### Architecture Approach

A standard client-server pattern. The Express backend exposes a `POST /api/draft` endpoint that starts the LangGraph run, which stops before publishing due to an `interruptBefore` rule. The endpoint returns the generated draft and a unique `threadId`. The user edits the text in React. When the user clicks "Publish", `POST /api/publish` updates the checkpoint state with the final edits and resumes the thread to push the post to LinkedIn's ugcPosts API.

### Critical Pitfalls

1. **Lost Client Edits:** Forgetting to update the graph state with the user's modifications before resuming the graph. *Avoided by calling `agent.updateState()` before resuming.*
2. **Local CORS Blocks:** Fetch failures when Vite makes requests to Express. *Avoided by integrating CORS middleware during development.*
3. **Expired LinkedIn Access Key:** Silent failures due to 60-day token expirations. *Avoided by writing clear validation errors to `state.error`.*

## Implications for Roadmap

### Phase 1: API Server & LangGraph Integration
- **Rationale:** Establishes the server-side foundation. The backend must be fully operational to handle mock requests before the frontend can be connected.
- **Delivers:** Express REST endpoints, CORS setup, thread state update & resume controllers, and error validations.
- **Addresses:** `WEB-01`
- **Avoids:** Lost Client Edits, Expired LinkedIn Access Key.

### Phase 2: React Dashboard UI
- **Rationale:** Develops the user interface on top of the established Express API endpoints.
- **Delivers:** Vite React client, responsive CSS layout, topic selector, custom inputs, markdown-free editor, character count warnings, status logs, and dry-run toggle.
- **Addresses:** `WEB-02`, `WEB-03`, `WEB-04`, `WEB-05`
- **Avoids:** CORS Blockage.

### Phase 3: Prompt Optimization
- **Rationale:** Improves draft quality and style conformity as a final optimization step.
- **Delivers:** Few-shot examples embedded inside the system prompt template in `src/core/prompts.ts`.
- **Addresses:** `PRMPT-01`

### Phase Ordering Rationale

Building backend endpoints first allows us to mock out API responses and verify thread updates via command line (`curl`) before frontend coding. The frontend UI is then built to query these functional APIs. Prompt tuning is left for the final phase so we can test LLM post outputs directly in the final web dashboard environment.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Standard Express/React/Vite. Fits cleanly into NodeNext module resolution. |
| Features | HIGH | Clear scope limits defined with mobile-web focus. |
| Architecture | HIGH | Standard LangGraph HITL checkpointing logic works perfectly with Express. |
| Pitfalls | HIGH | Stale draft updates and CORS are well-understood. |

**Overall confidence:** HIGH

---
*Research completed: 2026-06-17*
*Ready for roadmap: yes*
