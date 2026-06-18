---
phase: quick
plan: "260618-lou"
type: execute
wave: 1
depends_on: []
files_modified: ["client/src/components/LinkedInFeed.tsx", "client/src/components/EditorPanel.tsx", "client/src/components/ControlPanel.tsx", "client/src/App.tsx"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts with no hover pop-ups on buttons"
  artifacts:
    - path: "client/src/components/LinkedInFeed.tsx"
      provides: "Simulated feed component"
      contains: "ThumbsUp"
  key_links: []
---

<objective>
Review and refine the LinkedIn feed mockup and editor panel visually using clean LinkedIn-like design cues (e.g. real Lucide icons instead of standard emojis) while ensuring no buttons scale or pop up when hovered. Keep all files strictly under the 80-line limit.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Hover/Active Scale Animations from Buttons</name>
  <files>client/src/components/ControlPanel.tsx, client/src/components/EditorPanel.tsx, client/src/App.tsx</files>
  <read_first>client/src/components/ControlPanel.tsx, client/src/components/EditorPanel.tsx, client/src/App.tsx</read_first>
  <action>Remove all scale-up and scale-down hover/active classes (e.g. hover:scale-[1.01], active:scale-[0.99], active:scale-[0.98]) from buttons in ControlPanel.tsx, EditorPanel.tsx, and App.tsx. Use flat transition effects (bg color changes) instead.</action>
  <verify>All buttons in ControlPanel, EditorPanel, and App do not scale on hover or press.</verify>
  <acceptance_criteria>
    - No button classes contain scale-[x] for hover or active states.
    - All files remain strictly under 80 lines.
  </acceptance_criteria>
  <done>Removed scale-up/down animations from all dashboard and editor buttons.</done>
</task>

<task type="auto">
  <name>Task 2: Refine LinkedIn Feed Mockup & Editor Looks</name>
  <files>client/src/components/LinkedInFeed.tsx, client/src/components/EditorPanel.tsx</files>
  <read_first>client/src/components/LinkedInFeed.tsx, client/src/components/EditorPanel.tsx</read_first>
  <action>Refactor LinkedInFeed.tsx to use Lucide-react icons (ThumbsUp, MessageSquare, Repeat2, Send) for mockup actions instead of raw text emojis. Restyle feed actions bar for a premium look with flat hover background tints. Ensure all hover/active scale classes are removed. Keep files strictly under 80 lines.</action>
  <verify>LinkedIn feed mockup displays beautiful Lucide icons and feed/editor panels have premium, clean styles.</verify>
  <acceptance_criteria>
    - Feed actions display Lucide icons instead of raw emojis.
    - All buttons have flat states with no pop-up scale/translation effects.
    - All files remain under 80 lines.
  </acceptance_criteria>
  <done>Improved looks of simulated LinkedIn Feed and Editor Panel with premium brand-aligned aesthetics.</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
- [ ] No button scales or shifts position when hovered
</verification>

<success_criteria>
- Clean, premium feed and editor layout designs matching the LinkedIn brand
- Complete removal of hover scale/pop-up animations from all buttons
- All modified files remain strictly under 80 lines
</success_criteria>

<output>
Create `.planning/quick/260618-lou-improve-feed-and-editor-looks-and-remove/260618-lou-SUMMARY.md` on completion.
</output>
