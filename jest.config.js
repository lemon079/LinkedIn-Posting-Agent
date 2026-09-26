/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: "backend-node",
      testEnvironment: "node",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      testMatch: [
        "<rootDir>/src/tests/backend.test.ts",
        "<rootDir>/src/tests/health.test.ts",
        "<rootDir>/src/tests/llm.test.ts",
        "<rootDir>/src/tests/agent.unit.test.ts",
        "<rootDir>/src/tests/agent.integration.test.ts",
        "<rootDir>/src/tests/agent.evals.test.ts",
        "<rootDir>/src/tests/logger.test.ts",
        "<rootDir>/src/tests/errors.test.ts",
        "<rootDir>/src/tests/errorHandler.test.ts",
        "<rootDir>/src/tests/security.test.ts",
        "<rootDir>/src/tests/guardrail.resilience.test.ts",
        "<rootDir>/src/tests/versionChain.test.ts",
        "<rootDir>/src/tests/regressionBugs.test.ts",
        "<rootDir>/src/tests/hiringArchetype.test.ts",
        "<rootDir>/src/tests/crossProviderFallback.test.ts",
        "<rootDir>/src/tests/formatTrends2026.test.ts",
        "<rootDir>/src/tests/intent.test.ts",
        "<rootDir>/src/tests/headers.test.ts",
        "<rootDir>/src/tests/linkedin.test.ts",
        "<rootDir>/src/tests/redact.test.ts",
        "<rootDir>/src/tests/critiqueSystem.test.ts",
      ],


      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^(\\.\\.?/.*)\\.js$": "$1",
      },
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.json",
          },
        ],
      },
    },
    {
      displayName: "frontend-ui",
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      testMatch: [
        "<rootDir>/src/tests/ui.test.tsx",
        "<rootDir>/src/tests/streamError.test.ts",
        "<rootDir>/src/tests/generationLoader.test.tsx",
        "<rootDir>/src/tests/errorState.test.tsx",
        "<rootDir>/src/tests/webSearchGrounding.test.tsx",
      ],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^(\\.\\.?/.*)\\.js$": "$1",
      },
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.json",
          },
        ],
      },
    },
  ],
};

module.exports = config;
