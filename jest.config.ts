import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "backend-node",
      testEnvironment: "node",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      testMatch: [
        "<rootDir>/src/tests/backend.test.ts",
        "<rootDir>/src/tests/health.test.ts",
        "<rootDir>/src/tests/llm.test.ts",
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

export default config;
