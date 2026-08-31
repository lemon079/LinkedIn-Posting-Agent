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
        "<rootDir>/src/tests/security.test.ts",
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
      testMatch: ["<rootDir>/src/tests/ui.test.tsx"],
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
