---
phase: quick
plan: "260618-lcq"
type: execute
wave: 1
depends_on: []
files_modified: ["client/src/index.css", "client/src/App.tsx", "client/src/components/ControlPanel.tsx", "client/src/components/EditorPanel.tsx", "client/src/components/LinkedInFeed.tsx"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts cleanly in light mode"
  artifacts:
    - path: "client/src/index.css"
      provides: "Light mode theme definitions"
      contains: "#F3F2EF"
    - path: "client/src/App.tsx"
      provides: "Light mode dashboard rendering"
      contains: "bg-slate-100"
  key_links: []
---

<objective>
Migrate the frontend client to the official LinkedIn light mode brand theme (grey background, white cards, dark text, primary blue highlights) to ensure typed inputs and draft results are fully visible.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update client/src/index.css Theme Variables</name>
  <files>client/src/index.css</files>
  <read_first>client/src/index.css</read_first>
  <action>Open client/src/index.css. Update @theme colors and :root definitions to map to the new light mode scheme. Remove dark-mode class overrides if they conflict, or adapt them to look correct. Map primary to #0A66C2, main background to #F3F2EF, card surface to #FFFFFF, text-primary to #191919, text-secondary to #666666, and border/dividers to #E0E0E0. Update focus rings, warnings, errors, and button interaction states.</action>
  <verify>index.css compiles cleanly and has the required LinkedIn color values</verify>
  <acceptance_criteria>
    - client/src/index.css contains background, foreground, primary, and border mappings matching the spec
  </acceptance_criteria>
  <done>Updated CSS variables to LinkedIn light mode theme in index.css</done>
</task>

<task type="auto">
  <name>Task 2: Refactor Components for Light Theme Visibility</name>
  <files>client/src/components/ControlPanel.tsx, client/src/components/EditorPanel.tsx, client/src/components/LinkedInFeed.tsx, client/src/App.tsx</files>
  <read_first>client/src/components/ControlPanel.tsx, client/src/components/EditorPanel.tsx, client/src/components/LinkedInFeed.tsx, client/src/App.tsx</read_first>
  <action>Refactor App.tsx, ControlPanel.tsx, EditorPanel.tsx, and LinkedInFeed.tsx. Replace any dark-mode specific glassmorphism styling (like white opacity border-white/[0.08], bg-white/[0.03], text-slate-100) with clean light theme layout classes: bg-card (white), border-border (light gray), text-foreground (dark grey #191919). Make sure all input textareas and fields use clear text-foreground/slate-900 color for input text visibility. Ensure all files remain strictly under 80 lines.</action>
  <verify>All components compile cleanly and show high-contrast light theme colors</verify>
  <acceptance_criteria>
    - Textareas, select triggers, and inputs render with dark text on light backgrounds
    - All modified component files are strictly under 80 lines
  </acceptance_criteria>
  <done>Refactored components to support high-contrast light mode styling</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
- [ ] Inputs are fully visible with dark text on light fields
</verification>

<success_criteria>
- Entire dashboard styled in LinkedIn light mode brand identity
- Maximum contrast for text inputs, placeholder labels, and draft mockups
- All modified client files remain under the 80-line limit
</success_criteria>

<output>
Create `.planning/quick/260618-lcq-apply-light-mode-linkedin-brand-theme-co/260618-lcq-SUMMARY.md` on completion.
</output>
