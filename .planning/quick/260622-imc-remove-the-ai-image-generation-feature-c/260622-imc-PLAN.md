---
phase: quick
plan: "260622-imc"
type: execute
wave: 1
depends_on: []
files_modified: ["src/routes/posts.ts", "src/controllers/images.ts", "src/tests/images.test.ts", "src/core/prompts.ts", "client/src/lib/api.ts", "client/src/hooks/useAgent.ts", "client/src/components/LinkedInFeed.tsx", "client/src/components/DraftTabs.tsx", "client/src/App.tsx"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts"
    - "Express server starts and compiles without errors"
  artifacts:
    - path: "src/controllers/images.ts"
      provides: "AI image prompt generator endpoint"
      contains: "deleted"
  key_links: []
---

<objective>
Remove the AI image generation feature completely and its traces from the codebase.
1. Delete the backend controller `src/controllers/images.ts` and test file `src/tests/images.test.ts`.
2. Remove references to image generation in `src/routes/posts.ts` and `src/core/prompts.ts`.
3. Clean up the frontend references: `client/src/lib/api.ts`, `client/src/hooks/useAgent.ts`, `client/src/components/LinkedInFeed.tsx`, `client/src/components/DraftTabs.tsx`, and `client/src/App.tsx`.
4. Build the project and run tests to verify deployability.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clean Up Backend Image Generation References</name>
  <files>src/controllers/images.ts, src/tests/images.test.ts, src/routes/posts.ts, src/core/prompts.ts</files>
  <read_first>src/routes/posts.ts, src/core/prompts.ts</read_first>
  <action>Delete src/controllers/images.ts and src/tests/images.test.ts. Remove imports and routing for /generate-image from src/routes/posts.ts. Remove IMAGE_GENERATION_PROMPT from src/core/prompts.ts.</action>
  <verify>Backend starts and builds cleanly; the /generate-image route is completely removed.</verify>
  <acceptance_criteria>
    - src/controllers/images.ts does not exist.
    - src/tests/images.test.ts does not exist.
    - src/routes/posts.ts does not reference generateImagePrompt or route.
    - IMAGE_GENERATION_PROMPT is removed from src/core/prompts.ts.
  </acceptance_criteria>
  <done>Deleted backend files and references.</done>
</task>

<task type="auto">
  <name>Task 2: Clean Up Client-Side Image References</name>
  <files>client/src/lib/api.ts, client/src/hooks/useAgent.ts, client/src/components/LinkedInFeed.tsx, client/src/components/DraftTabs.tsx, client/src/App.tsx</files>
  <read_first>client/src/lib/api.ts, client/src/hooks/useAgent.ts</read_first>
  <action>Remove generateImage function from client/src/lib/api.ts. Remove imageUrl, isGeneratingImage, handleGenerateImage, and associated variables from client/src/hooks/useAgent.ts, client/src/components/LinkedInFeed.tsx, client/src/components/DraftTabs.tsx, and client/src/App.tsx.</action>
  <verify>Frontend compiles without TypeScript errors, and all references to graphics are removed from UI panel tabs and feed mockup.</verify>
  <acceptance_criteria>
    - generateImage helper is removed from client/src/lib/api.ts.
    - useAgent hook has no references to image state or handleGenerateImage.
    - App.tsx, DraftTabs.tsx, and LinkedInFeed.tsx have no reference to graphic/image generation.
  </acceptance_criteria>
  <done>Cleaned up all frontend image references.</done>
</task>

<task type="auto">
  <name>Task 3: Verify Builds and Deployability</name>
  <files></files>
  <read_first></read_first>
  <action>Run project build scripts (tsc on backend, client/ build) and any tests to ensure project is completely deployable and no typescript errors exist.</action>
  <verify>Backend test suite runs successfully, and frontend build finishes cleanly.</verify>
  <acceptance_criteria>
    - `npm run build` in root and `client/` succeeds.
    - `npm test` succeeds.
  </acceptance_criteria>
  <done>Verified builds and tests run successfully.</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
- [ ] Backend compiles and tests pass
</verification>

<success_criteria>
- AI Image generation feature is completely removed from both backend and frontend.
- No traces or leftover references to `generateImage` or `imageUrl` remain.
- The project is fully buildable, testable, and deployable.
</success_criteria>

<output>
Create `.planning/quick/260622-imc-remove-the-ai-image-generation-feature-c/260622-imc-SUMMARY.md` on completion.
</output>
