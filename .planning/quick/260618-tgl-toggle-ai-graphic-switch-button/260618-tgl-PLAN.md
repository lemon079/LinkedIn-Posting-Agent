---
phase: quick
plan: "260618-tgl"
type: execute
wave: 1
depends_on: []
files_modified: ["client/src/App.tsx", "client/src/components/LinkedInFeed.tsx"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts"
  artifacts:
    - path: "client/src/App.tsx"
      provides: "Dashboard main page"
      contains: "toggle-image"
  key_links: []
---

<objective>
Implement an interactive switch/check button to toggle AI graphic inclusion:
1. Replace the 'Generate AI Graphic' button in `client/src/App.tsx` with a modern Toggle Switch that invokes `handleGenerateImage` when turned ON and clears the image when turned OFF.
2. Update the simulated `LinkedInFeed.tsx` mockup card to display a clean loading pulse/spinner state when the image is generating, and show the graphic when complete.
3. Keep all files strictly under the 80-line limit.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace button with Switch Toggle in App.tsx</name>
  <files>client/src/App.tsx</files>
  <read_first>client/src/App.tsx</read_first>
  <action>Overwrite client/src/App.tsx to import Switch and Label, extract setImageUrl, and render a switch toggle instead of the generate button. Keep the file strictly under 80 lines.</action>
  <verify>App.tsx compiles cleanly and has the toggle switch component wired to generation/clear state.</verify>
  <acceptance_criteria>
    - Switch component is used to toggle post image generation.
    - App.tsx is under 80 lines.
  </acceptance_criteria>
  <done>Replaced prompt generator button with toggle switch.</done>
</task>

<task type="auto">
  <name>Task 2: Implement generating loading states in LinkedInFeed.tsx</name>
  <files>client/src/components/LinkedInFeed.tsx</files>
  <read_first>client/src/components/LinkedInFeed.tsx</read_first>
  <action>Update client/src/components/LinkedInFeed.tsx to receive isGeneratingImage prop and render an animated loader pulse placeholder during active generation. Keep the file under 80 lines.</action>
  <verify>LinkedIn feed displays loader placeholder while graphic is generating, and renders the image once finished.</verify>
  <acceptance_criteria>
    - loading state UI shows inside LinkedInFeed card mockup.
    - LinkedInFeed.tsx is under 80 lines.
  </acceptance_criteria>
  <done>Created animated loader states in post preview mockup.</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
</verification>

<success_criteria>
- AI image generation toggles dynamically via a checkbox switch
- Visual loading states represented during image generation
- Files remain strictly under 80 lines
</success_criteria>

<output>
Create `.planning/quick/260618-tgl-toggle-ai-graphic-switch-button/260618-tgl-SUMMARY.md` on completion.
</output>
