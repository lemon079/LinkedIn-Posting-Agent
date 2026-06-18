---
phase: quick
plan: "260618-fjq"
type: execute
wave: 1
depends_on: []
files_modified: ["package.json"]
autonomous: true
requirements: []
must_haves:
  truths:
    - "npm run dev runs both frontend and backend concurrently"
  artifacts:
    - path: "package.json"
      provides: "npm scripts to run frontend and backend"
      contains: "concurrently"
  key_links: []
---

<objective>
Configure the repository to support running both the Express backend API and the React client dev server concurrently with a single command: npm run dev.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install concurrently package as root devDependency</name>
  <files>package.json</files>
  <action>Install the concurrently package at the project root by running: npm install -D concurrently.</action>
  <verify>package.json contains concurrently in devDependencies</verify>
  <acceptance_criteria>
    - package.json has "concurrently" key in devDependencies
  </acceptance_criteria>
  <done>Installed concurrently as devDependency at root</done>
</task>

<task type="auto">
  <name>Task 2: Configure dev script in root package.json</name>
  <files>package.json</files>
  <read_first>package.json</read_first>
  <action>Modify package.json to add a "dev" script under "scripts": "concurrently \"npm run server\" \"npm --prefix client run dev\"". Ensure all file line length and formatting constraints are met.</action>
  <verify>package.json scripts contains dev script and compiles</verify>
  <acceptance_criteria>
    - package.json scripts has "dev": "concurrently \"npm run server\" \"npm --prefix client run dev\""
  </acceptance_criteria>
  <done>Configured "dev" script in root package.json</done>
</task>

</tasks>

<verification>
- [ ] Running npm run dev launches both backend and client servers without errors
</verification>

<success_criteria>
- Concurrently package installed at project root
- Unified npm run dev script created in root package.json
</success_criteria>

<output>
Create `.planning/quick/260618-fjq-run-frontend-and-backend-together-with-a/260618-fjq-SUMMARY.md` on completion.
</output>
