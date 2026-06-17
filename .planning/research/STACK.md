# Stack Research

**Domain:** Social Media Automation Dashboard (Web Triggered Agent)
**Researched:** 2026-06-17
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Express | 4.21.x | Backend REST API server | Standard, lightweight routing wrapper for Node.js. It integrates seamlessly into the existing TypeScript backend structure. |
| React | 19.x | Frontend UI components | Standard frontend library for building highly interactive interfaces. Offers fast state management for inputs/drafts. |
| Vite | 6.x | Frontend build and dev server | Modern bundler that provides fast compilation and a lightweight development loop. |
| LangGraph JS | 1.3.x | Agentic workflow execution | The existing graph architecture runs on LangGraph. This handles state propagation and breakpoints (HITL). |
| ChatGoogle | 0.1.x | LLM client API (Gemini 2.5 Flash) | Official LangChain client for Gemini. High output quality, large context, and low latency. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cors | 2.8.x | Enable cross-origin requests | Required when the Vite server (e.g., port 5173) makes calls to the Express API (e.g., port 3000). |
| tsx | 4.x | Direct TypeScript execution | Run the Express server and scheduler in TypeScript directly without manual compile steps. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Static code analysis | Extends typescript-eslint as configured in the project root. |
| TypeScript | Strict type safety | Conformed to existing `"module": "NodeNext"` specifications. |

## Installation

```bash
# Core Dependencies
npm install express cors

# Supporting Frontend Tools (Inside client directory)
# Or we can build the frontend inside a folder like `src/web/`
npm install react react-dom

# Dev dependencies
npm install -D @types/express @types/cors
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Express REST API | Next.js API Routes | If we wanted a fully unified serverless/SPA framework. Express is better here because it embeds directly into the existing Node process and scheduler without refactoring current file structures. |
| React/Vite | Vanilla JavaScript | If the UI was incredibly simple (1 input, 1 button). A dashboard with tabs, draft editing, character counts, status indicators, and logs runs cleaner with a declarative framework like React. |
| Web App | React Native Mobile App | If push notifications and app store delivery were hard requirements. A web app is better because it avoids compiling native builds while still providing responsive UI on mobile browsers. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@langchain/google-genai` | Deprecated LLM integration package. | `@langchain/google` (ChatGoogle) |
| System `cron` for all schedules | If running in local user space, system cron configurations can be complex. | In-process `node-cron` or serverless schedulers. |

## Stack Patterns by Variant

**If deployed locally (developer workspace):**
- Vite serves the frontend assets from `http://localhost:5173`.
- Express runs on `http://localhost:3000`.
- CORS is enabled in Express to allow requests from the Vite origin.

**If packaged for production/production container:**
- Vite builds the frontend assets into static files (`dist/client`).
- Express serves the static files using `express.static()`.
- The entire application runs on a single port (e.g., `http://localhost:3000`), eliminating CORS configuration requirements in production.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@langchain/google@0.1.12` | `@langchain/core@1.1.48` | Verified in existing project dependencies. |
| `typescript@5.9.3` | `typescript-eslint@8.60.0` | Matching compiler checks. |

## Sources

- `package.json` — verified current workspace libraries.
- LangChain JS documentation — verified ChatGoogle imports and graph integration constraints.

---
*Stack research for: Social Media Automation Dashboard*
*Researched: 2026-06-17*
