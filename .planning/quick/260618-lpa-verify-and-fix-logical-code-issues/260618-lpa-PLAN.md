---
phase: quick
plan: "260618-lpa"
type: execute
wave: 1
depends_on: []
files_modified: ["client/src/hooks/useAgent.ts", "client/src/lib/api.ts", "src/services/linkedin.ts", "client/src/components/ControlPanel.tsx"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "Vite React client compiles and starts"
    - "All modified source files are strictly under 80 lines"
  artifacts:
    - path: "src/services/linkedin.ts"
      provides: "LinkedIn API publishing client"
      contains: "x-restli-id"
  key_links: []
---

<objective>
Verify and fix logical parts of the code:
1. Fix LinkedIn API response header check in `publishLinkedInPost` to fetch `x-restli-id` (the correct LinkedIn UGC Post response header) instead of `x-linkedin-id`.
2. Pass `dryRun` configuration from the client to `/api/draft` to ensure matching initial state configuration.
3. Disable the Custom Topic input field in `ControlPanel.tsx` if a default topic/genre is selected to avoid UI selection confusion.
4. Refactor `useAgent.ts` hook to group loading and error states, reducing the total line count to strictly under the 80-line limit.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Correct LinkedIn Response Header Check</name>
  <files>src/services/linkedin.ts</files>
  <read_first>src/services/linkedin.ts</read_first>
  <action>Edit src/services/linkedin.ts to query response.headers.get("x-restli-id") first, fallback to x-linkedin-id. Ensure line count remains under 80 lines.</action>
  <verify>LinkedIn API utility correctly returns mock/real post Url based on the X-RestLi-Id header response.</verify>
  <acceptance_criteria>
    - x-restli-id header is queried when checking the response of UGC posts creation.
    - File is under 80 lines.
  </acceptance_criteria>
  <done>Updated LinkedIn API service to query the correct restli header.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor useAgent hook to be under 80 lines and pass dryRun</name>
  <files>client/src/hooks/useAgent.ts, client/src/lib/api.ts</files>
  <read_first>client/src/hooks/useAgent.ts, client/src/lib/api.ts</read_first>
  <action>Refactor client/src/hooks/useAgent.ts to group state variables (gen, pub, err) in a single useState call to shrink lines to under 80. Update generateDraft API and hook invocation to pass dryRun.</action>
  <verify>frontend agent hook compiles and passes dryRun parameter to generateDraft.</verify>
  <acceptance_criteria>
    - generateDraft accepts and passes dryRun parameter.
    - useAgent.ts hook is strictly under 80 lines.
  </acceptance_criteria>
  <done>Refactored useAgent hook to fit line limits and corrected dryRun payload flow.</done>
</task>

<task type="auto">
  <name>Task 3: Disable Custom Topic Input When Default Genre Is Selected</name>
  <files>client/src/components/ControlPanel.tsx</files>
  <read_first>client/src/components/ControlPanel.tsx</read_first>
  <action>Edit client/src/components/ControlPanel.tsx to disable the input field and lower its opacity when selectedTopic has a value (i.e. selectedTopic !== "").</action>
  <verify>Custom topic input field is disabled when a default topic is selected.</verify>
  <acceptance_criteria>
    - custom-topic input has disabled={selectedTopic !== ""} attribute.
    - File is under 80 lines.
  </acceptance_criteria>
  <done>Disabled custom topic input during default genre selections.</done>
</task>

</tasks>

<verification>
- [ ] Frontend client builds cleanly (`npm run build` inside `client/`)
- [ ] Backend server compiles and typescript checks pass
</verification>

<success_criteria>
- Correction of the LinkedIn restli header check
- All modified files remain strictly under 80 lines
</success_criteria>

<output>
Create `.planning/quick/260618-lpa-verify-and-fix-logical-code-issues/260618-lpa-SUMMARY.md` on completion.
</output>
