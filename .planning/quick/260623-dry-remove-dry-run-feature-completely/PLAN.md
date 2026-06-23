# Quick Task: Remove Dry Run Feature Completely

Remove the dry run feature across all layers of the codebase (frontend UI, hooks, API client, Next.js route handlers, LangGraph state, publishing service, environment config, and tests).

## Proposed Changes

### Configuration & Environment
- **[Modify] [env.ts](file:///d:/Work/linkedin-agent/src/config/env.ts)**: Remove `DRY_RUN` field from `AppConfig` interface and parsing logic.
- **[Modify] [.env](file:///d:/Work/linkedin-agent/.env)**: Remove `DRY_RUN` line.
- **[Modify] [.env.example](file:///d:/Work/linkedin-agent/.env.example)**: Remove `DRY_RUN` line.

### Services & Graph Logic
- **[Modify] [linkedin.ts](file:///d:/Work/linkedin-agent/src/services/linkedin.ts)**:
  - Remove `dryRunOverride?: boolean` from `publishLinkedInPost` parameter list.
  - Remove `const isDryRun = ...` and the associated check.
- **[Modify] [state.ts](file:///d:/Work/linkedin-agent/src/core/state.ts)**:
  - Remove `dryRun: Annotation<boolean>` from `AgentState`.
  - Remove `dryRun` type definition from `State` interface.
- **[Modify] [publishPost.ts](file:///d:/Work/linkedin-agent/src/graph/nodes/publishPost.ts)**:
  - Update `publishLinkedInPost` invocation to remove `state.dryRun`.

### Next.js Route Handlers
- **[Modify] [draft/route.ts](file:///d:/Work/linkedin-agent/src/app/api/draft/route.ts)**:
  - Remove `dryRun` extraction from request body.
  - Remove `dryRun` passing in graph state initialization and log output.
- **[Modify] [publish/route.ts](file:///d:/Work/linkedin-agent/src/app/api/publish/route.ts)**:
  - Remove `dryRun` extraction from request body.
  - Remove `dryRun` passing in graph state initialization and log output.

### Frontend UI & State
- **[Modify] [api.ts](file:///d:/Work/linkedin-agent/src/lib/api.ts)**:
  - Remove `dryRun` parameters from `generateDraft` and `publishPost` functions.
  - Remove `dryRun` from the body stringify calls in those functions.
- **[Modify] [useAgent.ts](file:///d:/Work/linkedin-agent/src/hooks/useAgent.ts)**:
  - Remove `dryRun` state (`const [dryRun, setDryRun] = useState(true);`).
  - Remove `dryRun` usage in `handleGenerate` and `handlePublish`.
  - Remove `dryRun` and `setDryRun` from the returned object of the hook.
- **[Modify] [page.tsx](file:///d:/Work/linkedin-agent/src/app/page.tsx)**:
  - Remove `dryRun` and `setDryRun` references from hook usage.
  - Remove `dryRun` prop passing to `<ControlPanel />`.
- **[Modify] [ControlPanel.tsx](file:///d:/Work/linkedin-agent/src/components/ControlPanel.tsx)**:
  - Remove `dryRun` from `ControlPanelProps` interface and destructured arguments.
  - Remove the "Dry-Run Mode" Switch container completely from the render tree.

### Unit Tests
- **[Modify] [linkedin.test.ts](file:///d:/Work/linkedin-agent/src/tests/linkedin.test.ts)**:
  - Delete `publishLinkedInPost - handles dry run` test case.
  - Remove the second parameter `false` (which was dryRun) from all remaining `publishLinkedInPost` test invocations.

## Verification Plan
- Build check: `npm run build`
- Unit tests run: `npm run test`
