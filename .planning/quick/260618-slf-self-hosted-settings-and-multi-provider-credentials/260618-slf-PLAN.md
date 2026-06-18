---
phase: quick
plan: "260618-slf"
type: execute
wave: 1
depends_on: []
files_modified: ["package.json", "src/services/llm.ts", "src/services/linkedin.ts", "src/core/state.ts", "src/graph/nodes/generatePost.ts", "src/graph/nodes/publishPost.ts", "src/controllers/posts.ts", "src/controllers/publish.ts", "src/controllers/images.ts", "src/routes/posts.ts", "client/src/components/SettingsPanel.tsx", "client/src/components/Header.tsx", "client/src/hooks/useAgent.ts", "client/src/lib/api.ts", "client/src/App.tsx"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts"
    - "Express server starts and serves routes"
  artifacts:
    - path: "client/src/components/SettingsPanel.tsx"
      provides: "Settings configuration drawer UI"
      contains: "Self-Hosted Configuration"
  key_links: []
---

<objective>
Implement self-hosted settings allowing users to configure their own LLM providers (Gemini, OpenAI GPT, Anthropic Claude) and credentials dynamically via the dashboard UI, passing them stateless in request headers. Keep all files under 80 lines.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install LLM integrations & update backend services</name>
  <files>package.json, src/services/llm.ts, src/services/linkedin.ts, src/core/state.ts, src/graph/nodes/generatePost.ts, src/graph/nodes/publishPost.ts</files>
  <action>Install @langchain/openai and @langchain/anthropic. Refactor llm.ts to dynamically create ChatOpenAI, ChatAnthropic, or ChatGoogle based on state overrides. Refactor linkedin.ts to support parameter-based credentials. Add credentials attributes to Graph state. Update graph nodes to read overrides from State.</action>
  <verify>Backend compiler succeeds, and the LLM factory supports multi-provider wrappers.</verify>
  <done>Installed integration modules and enabled dynamic LLM instantiations on the backend.</done>
</task>

<task type="auto">
  <name>Task 2: Implement header credentials extraction in Express controllers</name>
  <files>src/controllers/posts.ts, src/controllers/publish.ts, src/controllers/images.ts, src/routes/posts.ts</files>
  <action>Create src/controllers/publish.ts and move publishDraft there to avoid exceeding 80 lines. Update posts router to import it. Update draft, publish, and image controllers to extract custom request headers (x-llm-provider, x-llm-api-key, x-linkedin-token, x-linkedin-urn) and override graph/LLM settings.</action>
  <verify>Request endpoints parse x-llm-provider and override keys correctly in the state.</verify>
  <done>Built controllers to intercept headers and override state configurations.</done>
</task>

<task type="auto">
  <name>Task 3: Build frontend settings panel drawer and sync localStorage</name>
  <files>client/src/components/SettingsPanel.tsx, client/src/components/Header.tsx, client/src/hooks/useAgent.ts, client/src/lib/api.ts, client/src/App.tsx</files>
  <action>Create client/src/components/SettingsPanel.tsx to input credentials. Create client/src/components/Header.tsx to host settings buttons and trim App.tsx. Update useAgent.ts to load/persist keys in localStorage and pass customKeys to fetch helpers. Update api.ts to attach custom headers on draft, publish, and image fetch operations. Update App.tsx to display settings modal.</action>
  <verify>Vite client builds successfully, settings persist in browser localStorage, and custom headers are sent in fetch calls.</verify>
  <done>Integrated settings side-drawer and dynamic request header binding in frontend.</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
- [ ] Backend compiles and tests pass
</verification>

<success_criteria>
- Multi-provider model configuration support (OpenAI, Anthropic, Gemini)
- Stateless credentials passing via localStorage and request headers
- All code files strictly comply with the 80-line constraint
</success_criteria>
