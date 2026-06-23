# LinkedIn Daily Posting Agent

## What This Is

A stateful LangGraph agent that automates drafting, searching, validating, and publishing technical LinkedIn posts. It provides a visual web dashboard to allow users to trigger posts on-demand, choose topics, customize context, edit draft copy in a rich text editor, and publish immediately, while supporting high-fidelity LinkedIn styles and secure multi-user profiles.

## Core Value

Empower the user to draft and publish high-quality, technically accurate, and styled LinkedIn posts on-demand or on a schedule with complete manual editing control.

## Requirements

### Validated

- ✓ **CLI-01**: Generate technical posts based on a topic using Gemini 2.5 Flash and Tavily Search tool grounding — *existing*
- ✓ **CLI-02**: Assert character constraints (<= 3000 chars) and validate draft content before publishing — *existing*
- ✓ **CLI-03**: Interrupt graph execution (HITL) before final publication to obtain manual confirmation — *existing*
- ✓ **CLI-04**: Publish posts to LinkedIn UGC API using OAuth 2.0 access token configurations — *existing*
- ✓ **CLI-05**: Run on a daily schedule using `node-cron` or execute one-off via interactive CLI — *existing*
- ✓ **WEB-01**: Develop a Next.js REST API server to expose LangGraph runner endpoints (`POST /api/draft`, `POST /api/publish`, `GET /api/topics`) — *v1.0*
- ✓ **WEB-02**: Create a responsive SPA Web Dashboard (React/Vite) that serves as the visual control interface — *v1.0*
- ✓ **WEB-03**: Provide a UI layout to trigger drafts based on pre-defined or custom topics — *v1.0*
- ✓ **WEB-04**: Embed an interactive editing view in the UI to let the user review and modify drafts before publishing — *v1.0*
- ✓ **WEB-05**: Implement character count tracking and limit warnings in the editor — *v1.0*
- ✓ **PRMPT-01**: Enhance the ghostwriter prompt with high-fidelity few-shot technical writing templates — *v1.0*
- ✓ **SEC-01**: Encrypt credentials symmetrically using AES-256-GCM at rest — *v1.0*
- ✓ **AUTH-01**: User JWT email login and sign-up with Supabase integration — *v1.0*
- ✓ **AUTH-02**: LinkedIn OAuth 2.0 redirect login and token callback exchange — *v1.0*

### Active

- [ ] **NOTF-01**: Integrate messaging app notifications (e.g. Telegram or Slack Webhooks) with quick-approve buttons.

### Out of Scope

- **MOB-01**: React Native mobile app — Deferred due to high compilation, testing, and deployment overhead. A responsive web browser UI achieves the mobile goal with much lower complexity.
- **MEDIA-01**: Image or video uploads — Post content is restricted to plain text share commentary.

## Context

- **Current Implementation:** Built in TypeScript, using Next.js route handlers for API endpoints, Supabase for authentication & encrypted settings storage, LangGraph for ghostwriter agent state coordination, and React for the dashboard UI.
- **Verification:** Tested extensively via standard node:test unit tests (12 passing tests) and ESLint validations.

## Constraints

- **Tech Stack**: Must extend the existing Node.js/TypeScript and LangGraph codebase.
- **Dependencies**: Restrict front-end tooling to standard React, Vite, and Vanilla CSS. No tailwind unless explicitly required.
- **API Limits**: The LinkedIn member access token is static and expires every 60 days.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web Dashboard over React Native | React Native adds build-time complexities for testing on device; web app delivers mobile triggers easily via standard browsers. | ✓ Shipped |
| Few-shot Prompting Addition | Instruction-only prompts often fail to capture formatting nuances (like paragraph spacing and inline emojis). | ✓ Shipped |
| Supabase Auth & DB Settings | Secure user authentication and database configuration sync allows reliable multi-user hosting. | ✓ Shipped |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-06-23 after v1.0 milestone*
