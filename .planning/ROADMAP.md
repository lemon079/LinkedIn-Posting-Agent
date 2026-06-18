# Roadmap: LinkedIn Daily Posting Agent

## Overview

This roadmap lays out the path to turn the command-line LinkedIn posting agent into a web-enabled application. We will first build a backend Express API to expose the LangGraph execution flow (running drafts, halting for review, and publishing edited text). Second, we will build a responsive React frontend dashboard to let users control the posting flow from mobile and desktop browsers. Finally, we will refine prompt quality using few-shot techniques to ensure posts follow actual high-quality LinkedIn patterns.

## Phases

- [x] **Phase 1: API Server & LangGraph REST integration** - Expose REST endpoints to trigger and resume LangGraph thread executions.
- [x] **Phase 2: React Dashboard UI** - Create a mobile-responsive dashboard to select topics, edit drafts, and trigger publishing.
- [x] **Phase 3: Prompt Optimization** - Integrate few-shot technical post examples to align Gemini outputs to authentic LinkedIn formats.

## Phase Details

### Phase 1: API Server & LangGraph REST integration
**Goal**: Bootstrap an Express server integrating endpoints to trigger and resume LangGraph runs, while handling state updates.
**Depends on**: Nothing (first phase)
**Requirements**: API-01, API-02, API-03
**Success Criteria**:
  1. `GET /api/topics` successfully serves default topic genres.
  2. `POST /api/draft` invokes the agent, halts execution at the publish node, and yields the thread ID and generated draft.
  3. `POST /api/publish` resumes the thread, updates the state with the edited copy, and publishes the final text to LinkedIn.
**Plans**: 2 plans

Plans:
- [x] 01-01: Express API Boilerplate & Topic Endpoint
- [x] 01-02: LangGraph integration endpoints (Draft & Publish)

### Phase 2: React Dashboard UI
**Goal**: Create a responsive frontend dashboard letting the user trigger drafts, modify content, and post to LinkedIn.
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria**:
  1. The dashboard opens cleanly in both mobile and desktop browsers.
  2. The user can select topics or provide custom topics and context parameters.
  3. The user can edit the post draft in an inline editor textarea.
  4. The user can toggle dry-run mode and trigger publishing.
**Plans**: 2 plans

Plans:
- [x] 02-01: React client setup and form inputs layout
- [x] 02-02: Rich draft preview, editor field, and trigger integrations

### Phase 3: Prompt Optimization
**Goal**: Optimize ghostwriter prompt quality with high-fidelity few-shot technical writing examples.
**Depends on**: Phase 2
**Requirements**: PRMPT-01
**Success Criteria**:
  1. The agent writes technical posts using conversational whiteboard-style delivery without markdown asterisks.
  2. System prompt file `prompts.ts` contains 3 distinct few-shot examples.
**Plans**: 1 plan

Plans:
- [x] 03-01: Few-shot prompt tuning

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. API Server | 2/2 | Completed | 2026-06-18 |
| 2. Dashboard UI | 2/2 | Completed | 2026-06-18 |
| 3. Prompt Opt | 1/1 | Completed | 2026-06-18 |

---
*Roadmap defined: 2026-06-17*
*Last updated: 2026-06-17 after initial definition*
