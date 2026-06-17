# Technology Stack

**Analysis Date:** 2026-06-17

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code

**Secondary:**
- JavaScript - Configuration files (`eslint.config.js`)

## Runtime

**Environment:**
- Node.js 20.x
- No browser runtime (CLI/cron scheduler only)

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- None (vanilla Node.js app using `@langchain/langgraph` for orchestration)

**Testing:**
- None (no test framework configured)

**Build/Dev:**
- tsx 4.x - For running TypeScript source directly without manual build step
- typescript 5.9.3 - TypeScript compiler (`tsc`)

## Key Dependencies

**Critical:**
- `@langchain/langgraph` v1.3.2 - Stateful agent graph framework
- `@langchain/google` v0.1.12 - Google Gemini model integration
- `@langchain/tavily` v1.2.0 - Tavily Search API client for web search during post drafting
- `@google/generative-ai` v0.24.1 - Underlying Google generative AI SDK
- `@langchain/core` v1.1.48 - LangChain abstractions and messages

**Infrastructure:**
- `node-cron` v3.0.0 - Daily cron scheduler
- `dotenv` v16.0.0 - Loads configuration from `.env` file

## Configuration

**Environment:**
- Configured via `.env` file containing secrets and configuration options
- Key vars: `GOOGLE_API_KEY`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN`, `TOPIC`, `CONTEXT`, `TAVILY_API_KEY`, `DRY_RUN`

**Build:**
- `tsconfig.json` - TypeScript compilation and module resolution options (`NodeNext`)
- `eslint.config.js` - ESLint configuration

## Platform Requirements

**Development:**
- Windows/macOS/Linux with Node.js 20+ installed
- API keys for Google Gemini, LinkedIn REST API, and Tavily Search (optional)

**Production:**
- Standard server/VM or container running Node.js 20+
- Running as a persistent process (`node src/scheduler.ts --schedule`) or invoked via system cron (`tsx src/scheduler.ts`)

---

*Stack analysis: 2026-06-17*
*Update after major dependency changes*
