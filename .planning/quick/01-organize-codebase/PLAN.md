# Plan: Codebase Professional Reorganization

Refactor the codebase by decomposing the Express server and CLI scheduler to align with the 80-line file length limit.

## Proposed Changes

### Express API Server

#### [MODIFY] [server.ts](file:///d:/Work/linkedin-agent/src/server.ts)
- Clean up server.ts by importing `postsRouter` and mounting it on `/api`. Remove inline route handlers and CORS configurations. Keep under 30 lines.

#### [NEW] [posts.ts (routes)](file:///d:/Work/linkedin-agent/src/routes/posts.ts)
- Create `src/routes/posts.ts`. Instantiate Express Router, define endpoints (`GET /topics`, `POST /draft`, `POST /publish`), and bind them to the controller functions.

#### [NEW] [posts.ts (controllers)](file:///d:/Work/linkedin-agent/src/controllers/posts.ts)
- Create `src/controllers/posts.ts`. Implement the request/response controllers for `getTopics`, `generateDraft`, and `publishDraft`. Move the agent execution logic here.

---

### CLI Scheduler

#### [MODIFY] [scheduler.ts](file:///d:/Work/linkedin-agent/src/scheduler.ts)
- Remove `getTopic` and `askQuestion` helpers. Import them from `./core/utils.js`. Ensure the core run execution fits under 80 lines.

#### [NEW] [utils.ts](file:///d:/Work/linkedin-agent/src/core/utils.ts)
- Create `src/core/utils.ts`. Move the random topic picker `getTopic` and terminal question resolver `askQuestion` into this file.

---

## Verification Plan

### Automated Checks
- Run `npx tsc --noEmit` to ensure TypeScript compilation is completely clean.
- Run `npm run lint` to verify all files adhere to code style guidelines and ESM file extension rules (importing relative files using `.js`).

### Manual Verification
- Start the Express API server: `npm run server` and verify the `/api/topics` endpoint returns topics list.
- Run the CLI scheduler in interactive mode: `npm start` and verify it boots up and selects a random topic.
