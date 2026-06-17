# LinkedIn Daily Posting Agent

## What This Is

A stateful LangGraph agent that automates drafting, searching, validating, and publishing technical LinkedIn posts. It provides a visual web dashboard to allow users to trigger posts on-demand, choose topics, customize context, edit draft copy in a rich text editor, and publish immediately, while supporting high-fidelity LinkedIn styles.

## Core Value

Empower the user to draft and publish high-quality, technically accurate, and styled LinkedIn posts on-demand or on a schedule with complete manual editing control.

## Requirements

### Validated

- ✓ **CLI-01**: Generate technical posts based on a topic using Gemini 2.5 Flash and Tavily Search tool grounding — *existing*
- ✓ **CLI-02**: Assert character constraints (<= 3000 chars) and validate draft content before publishing — *existing*
- ✓ **CLI-03**: Interrupt graph execution (HITL) before final publication to obtain manual confirmation — *existing*
- ✓ **CLI-04**: Publish posts to LinkedIn UGC API using OAuth 2.0 access token configurations — *existing*
- ✓ **CLI-05**: Run on a daily schedule using `node-cron` or execute one-off via interactive CLI — *existing*
- ✓ **CLI-06**: Execute in dry-run mode to print draft outcomes to console without invoking the live API — *existing*

### Active

- [ ] **WEB-01**: Develop a lightweight Express-based API server to expose LangGraph runner endpoints (`POST /api/draft`, `POST /api/publish`, `GET /api/topics`).
- [ ] **WEB-02**: Create a responsive SPA Web Dashboard (React/Vite) that serves as the visual control interface on desktop and mobile browsers.
- [ ] **WEB-03**: Provide a UI layout to trigger drafts based on pre-defined topics or custom topics with optional context.
- [ ] **WEB-04**: Embed an interactive editing view (textarea/editor) in the UI to let the user review and modify drafts before publishing.
- [ ] **WEB-05**: Implement real-time character count tracking in the editor to ensure final drafts satisfy the 3000-character limit.
- [ ] **PRMPT-01**: Enhance the LinkedIn ghostwriter prompt (`prompts.ts`) with high-fidelity few-shot examples to align formatting (e.g. line spacing, emojis, uppercase emphasis) to real LinkedIn posts.

### Out of Scope

- **MOB-01**: React Native mobile app — Deferred due to high compilation, testing, and deployment overhead. A responsive web browser UI achieves the mobile goal with much lower complexity.
- **AUTH-01**: Browser-based OAuth flow — Access tokens and Person URN are managed securely via static configurations (`.env`) for simplicity.
- **MEDIA-01**: Image or video uploads — Post content is restricted to plain text share commentary.

## Context

- **Current Implementation:** Built in Node/TypeScript using `@langchain/langgraph` and `@langchain/google` (Gemini 2.5 Flash).
- **Triggers:** The scheduler currently prompts the user via a terminal command-line prompt. Adding a web interface enables mobile trigger capability and removes command-line execution dependencies for non-developer runs.
- **Formatting Constraints:** LinkedIn feeds display raw text (no markdown formatting like asterisks or hashtags inside sentences). Emojis and spacing must be tightly controlled to prevent typical AI markers.

## Constraints

- **Tech Stack**: Must extend the existing Node.js/TypeScript and LangGraph codebase.
- **Dependencies**: Restrict front-end tooling to standard React, Vite, and Vanilla CSS. No tailwind unless explicitly required.
- **API Limits**: The LinkedIn member access token is static and expires every 60 days.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web Dashboard over React Native | React Native adds build-time complexities for testing on device; web app delivers mobile triggers easily via standard browsers. | — Pending |
| Few-shot Prompting Addition | Instruction-only prompts often fail to capture formatting nuances (like paragraph spacing and inline emojis). | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-17 after initialization*
