---
phase: quick
plan: "260618-img"
type: execute
wave: 1
depends_on: []
files_modified: ["src/routes/posts.ts", "src/controllers/images.ts", "client/src/lib/api.ts", "client/src/hooks/useAgent.ts", "client/src/components/LinkedInFeed.tsx", "client/src/App.tsx"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts"
    - "Express server starts and serves /api/generate-image endpoint"
  artifacts:
    - path: "src/controllers/images.ts"
      provides: "AI image prompt generator endpoint"
      contains: "pollinations"
  key_links: []
---

<objective>
Implement a feature enabling users to generate a customized AI post graphic on-demand.
1. Create a new backend controller `src/controllers/images.ts` that uses Gemini to write a visual image prompt from the post draft, returning a Pollinations AI image URL.
2. Mount the endpoint `POST /api/generate-image` in `src/routes/posts.ts`.
3. Add API client helper and React state hook bindings (`imageUrl`, `isGeneratingImage`, `handleGenerateImage`).
4. Add a 'Generate AI Graphic' button in the dashboard next to the switcher tabs and render the generated graphic inside the LinkedIn Feed mockup card.
5. Keep all modified and new files strictly under the 80-line limit.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build Backend Image Prompt Generator Endpoint</name>
  <files>src/controllers/images.ts, src/routes/posts.ts</files>
  <read_first>src/routes/posts.ts</read_first>
  <action>Create src/controllers/images.ts and export generateImagePrompt to invoke Gemini ChatGoogle to create a descriptive technical image prompt from the post draft, returning a Pollinations AI image URL. Import and mount the route POST /api/generate-image in src/routes/posts.ts. Keep both files under 80 lines.</action>
  <verify>POST /api/generate-image endpoint returns a Pollinations AI URL when given draft text.</verify>
  <acceptance_criteria>
    - src/controllers/images.ts is created under 80 lines.
    - POST /api/generate-image is registered in src/routes/posts.ts.
  </acceptance_criteria>
  <done>Created image generation controller and registered the Express route.</done>
</task>

<task type="auto">
  <name>Task 2: Update Client API & Hook with Image Generation Logic</name>
  <files>client/src/lib/api.ts, client/src/hooks/useAgent.ts</files>
  <read_first>client/src/lib/api.ts, client/src/hooks/useAgent.ts</read_first>
  <action>Add generateImage helper to client/src/lib/api.ts. Refactor client/src/hooks/useAgent.ts to add imageUrl, isGeneratingImage, and handleGenerateImage logic. Reset imageUrl on handleGenerate runs. Keep both files strictly under 80 lines.</action>
  <verify>Frontend state hook exposes image status and handlers correctly.</verify>
  <acceptance_criteria>
    - useAgent hook exposes imageUrl, isGeneratingImage, and handleGenerateImage.
    - generateImage helper exists.
    - Files are under 80 lines.
  </acceptance_criteria>
  <done>Integrated image generation state variables and handler in client hook.</done>
</task>

<task type="auto">
  <name>Task 3: Integrate AI Graphic Button & Mockup Rendering in UI</name>
  <files>client/src/App.tsx, client/src/components/LinkedInFeed.tsx</files>
  <read_first>client/src/App.tsx, client/src/components/LinkedInFeed.tsx</read_first>
  <action>Edit client/src/App.tsx to add a 'Generate AI Graphic' button next to the tab bar. Edit client/src/components/LinkedInFeed.tsx to receive and render the imageUrl inside a modern post graphic container beneath the post text. Keep both files under 80 lines.</action>
  <verify>The dashboard displays the 'Generate AI Graphic' button, and clicking it renders the image inside the feed mockup.</verify>
  <acceptance_criteria>
    - Image rendering box is added to LinkedInFeed.tsx.
    - Button to trigger generation is added to App.tsx.
    - Files are under 80 lines.
  </acceptance_criteria>
  <done>Added UI controls to trigger and preview the generated post graphics.</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
- [ ] Backend compiles and tests pass
</verification>

<success_criteria>
- Graphic generation executes on user request using Gemini and Pollinations AI
- Clean visual rendering of the generated post graphic inside the LinkedIn mockup
- All files strictly adhere to the 80-line constraint
</success_criteria>

<output>
Create `.planning/quick/260618-img-ai-image-generation-feature-for-posts/260618-img-SUMMARY.md` on completion.
</output>
