---
phase: quick
plan: "260618-mta"
type: execute
wave: 1
depends_on: []
files_modified: ["client/index.html", "client/public/favicon.svg"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts"
  artifacts:
    - path: "client/index.html"
      provides: "HTML metadata page setup"
      contains: "LinkedIn Posting Agent"
    - path: "client/public/favicon.svg"
      provides: "Custom SVG favicon"
      contains: "#0A66C2"
  key_links: []
---

<objective>
Implement high-fidelity metadata tags for SEO and branding inside index.html, and replace the generic placeholder favicon with a custom-designed, LinkedIn-themed AI agent SVG icon. Keep all modified files under the 80-line limit.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace generic favicon.svg with custom LinkedIn Posting Agent SVG</name>
  <files>client/public/favicon.svg</files>
  <read_first>client/public/favicon.svg</read_first>
  <action>Overwrite client/public/favicon.svg with a customized, minimalist vector SVG representing an AI paper draft inside a LinkedIn blue card container. Keep the file extremely short (under 80 lines).</action>
  <verify>favicon.svg contains standard vector paths and the LinkedIn primary brand color.</verify>
  <acceptance_criteria>
    - favicon.svg is overwritten with clean custom vector paths.
    - File has fewer than 80 lines.
  </acceptance_criteria>
  <done>Created custom Vector SVG favicon for the application branding.</done>
</task>

<task type="auto">
  <name>Task 2: Inject SEO and Branding Metadata tags into index.html</name>
  <files>client/index.html</files>
  <read_first>client/index.html</read_first>
  <action>Edit client/index.html to update the title tag to 'LinkedIn Posting Agent | Stateful AI Ghostwriter' and add meta tags for description, author, keywords, and OpenGraph headers. Keep total lines strictly under 80 lines.</action>
  <verify>index.html resolves cleanly and has comprehensive meta tags in the head block.</verify>
  <acceptance_criteria>
    - title tag updated.
    - Meta tags for SEO and og: properties are present.
    - Line count is under 80 lines.
  </acceptance_criteria>
  <done>Configured comprehensive SEO and social metadata tags in index.html.</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
</verification>

<success_criteria>
- Custom SEO headers, title, and OpenGraph tags implemented
- Customized, brand-aligned SVG favicon deployed
- All modified files remain strictly under 80 lines
</success_criteria>

<output>
Create `.planning/quick/260618-mta-implement-metadata-tags-and-proper-icons/260618-mta-SUMMARY.md` on completion.
</output>
