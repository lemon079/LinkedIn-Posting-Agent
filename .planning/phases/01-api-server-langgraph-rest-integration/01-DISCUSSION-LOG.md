# Phase 1: API Server & LangGraph REST integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 01-api-server-langgraph-rest-integration
**Areas discussed:** API Route Pattern, Local CORS & Port Setup

---

## API Route Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Flat Endpoints | GET /api/topics, POST /api/draft, POST /api/publish. Simplest mapping to state machine transitions. | ✓ |
| RESTful Resource Endpoints | POST /api/posts for drafting, POST /api/posts/:threadId/publish for publishing. | |

**User's choice:** Flat Endpoints (GET /api/topics, POST /api/draft, POST /api/publish)
**Notes:** Decided on flat endpoints because there is no backend database entity mapping. Thread configurations are stored in-memory, making flat routing state transition representations simpler.

---

## Local CORS & Port Setup

### Port Selection
| Option | Description | Selected |
|--------|-------------|----------|
| Port 3000 | Standard default local Node/Express port. | ✓ |
| Port 8080 | Alternative web API port. | |

**User's choice:** Port 3000

### CORS Configuration
| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist local Vite origin | Allow requests only from `http://localhost:5173` in development. | ✓ |
| Wildcard | Allow `*` for all origins. | |

**User's choice:** Whitelist local Vite origin (http://localhost:5173)

---

## the agent's Discretion

- Checkpoint Persistence: Retain `MemorySaver` in-memory checkpointer as recommended without database persistence.
- Express body parsing middleware choices, request-response serialization interfaces, API response error text strings.

## Deferred Ideas

- SQLite checkpointer integration (not required for MVP scope).
