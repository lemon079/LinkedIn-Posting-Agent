<!-- generated-by: gsd-doc-writer -->
# Testing & Quality Assurance

Praxis maintains an automated testing suite comprising 17 test suites and 158 tests covering agent logic, LLM fallback resilience, guardrail heuristics, SSE streaming transport, and React UI components.

---

## Test Framework & Setup

Praxis uses **Jest 30** with **ts-jest** for TypeScript compilation and type-checking during test execution.

### Multi-Project Architecture
Configured in `jest.config.js`, the test runner splits tests into two isolated execution environments:

1. **`backend-node` Project (Node.js Environment)**:
   - Environment: `node`
   - Target files: `src/tests/*.ts` (excluding React DOM tests)
   - Scope: LangGraph state transitions, LLM model factory, AES-256-GCM cryptography, logger formatting, error handler recovery, and prompt evaluation benchmarks.
2. **`frontend-ui` Project (JSDOM Environment)**:
   - Environment: `jsdom`
   - Target files: `src/tests/*.tsx`, `src/tests/streamError.test.ts`, `src/tests/errorState.test.tsx`
   - Scope: React 19 component rendering, Assistant-UI error banners, generation loaders, and DOM event listeners.

### Global Test Setup
[`jest.setup.js`](file:///d:/Work/linkedin-agent/jest.setup.js) initializes mock environment variables and browser globals:
- Injects a static 32-byte `ENCRYPTION_KEY`.
- Sets `NEXT_PUBLIC_API_URL = "http://localhost:3000"`.
- Polyfills standard Web APIs for Node.js (`TextEncoder`, `TextDecoder`, `ReadableStream`).

---

## Running Tests

### 1. Run the Full Test Suite
```bash
npm test
```
Executes all 17 test suites across both `backend-node` and `frontend-ui` projects.

### 2. Run with Coverage
```bash
npm test -- --coverage
```
Generates a detailed line, statement, and branch coverage report in the `coverage/` directory.

### 3. Run a Specific Project
```bash
# Run only backend node tests:
npx jest --selectProjects backend-node

# Run only frontend UI tests:
npx jest --selectProjects frontend-ui
```

### 4. Run a Specific Test File
```bash
# Test error recovery logic:
npx jest src/tests/errorHandler.test.ts

# Test hook version stack:
npx jest src/tests/versionChain.test.ts

# Test Assistant-UI ErrorState rendering:
npx jest src/tests/errorState.test.tsx
```

### 5. Watch Mode
```bash
npx jest --watch
```

---

## Writing New Tests

### File Conventions
- Place all test files in `src/tests/`.
- Backend/Node specs must use `.test.ts` extension and be registered under `backend-node` in `jest.config.js`.
- Frontend/DOM specs must use `.test.tsx` (or `.test.ts` for DOM-dependent hooks) and be registered under `frontend-ui` in `jest.config.js`.

### Mocking Guidelines
- **Supabase Client**: Mock `@/lib/supabase/server` and `@/lib/supabase/client` to avoid remote database roundtrips during unit testing.
- **LLM Invocations**: Use mock chat models or stub `createModel` in `src/modules/agent/llm/factory.ts` unless writing explicit integration evaluations (`agent.evals.test.ts`).
- **LinkedIn API**: Mock HTTP endpoints using Axios or Fetch mocks to simulate OAuth flows, media uploads, and UGC post creation.

### Example Test Structure
```typescript
import { analyzeIntake } from "@/modules/agent/nodes/analyzeIntake";
import type { State } from "@/modules/agent/core/state";

describe("analyzeIntake Node", () => {
  it("should extract topic and default tone from prompt", async () => {
    const initialState: State = {
      userPrompt: "How we refactored our caching layer",
      archetype: "incident_teardown",
      tone: "conversational",
      domain: "backend",
    };

    const update = await analyzeIntake(initialState);
    expect(update.intake?.topic).toContain("caching");
  });
});
```

---

## Coverage Requirements

| Metric | Target | Notes |
|---|---|---|
| Statements | > 80% | Enforces high branch execution across LangGraph conditional routes. |
| Branches | > 75% | Tests both success paths and error fallback branches (`errorHandler.ts`). |
| Functions | > 80% | Covers node functions, helper utilities, and cryptographic routines. |
| Lines | > 80% | Verified during CI runs. |

---

## CI Integration

Automated testing is enforced in the GitHub Actions CI pipeline defined in [`.github/workflows/ci.yml`](file:///d:/Work/linkedin-agent/.github/workflows/ci.yml):

```yaml
unit-tests:
  name: Run Unit Tests
  runs-on: ubuntu-latest
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: 'npm'

    - name: Install Dependencies
      run: npm install

    - name: Run Jest Unit Tests
      run: npm run tests -- --ci --coverage
```

Every push to `main`, `dev`, or `feature/**` branches, and all pull requests, must pass the full test suite and coverage check before merging.
