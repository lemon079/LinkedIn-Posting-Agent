# Discussion Log: Phase 3 Prompt Optimization

This log details design decisions, preferences, and details clarified for Phase 3.

## Clarified Scope

### 1. What are the few-shot categories?
- Distributed systems (Kafka)
- Databases (Postgres)
- Frontend engineering (React)

### 2. What are the constraints for prompt engineering?
- Keep all source code files under 80 lines (strict project rule).
- Store examples in `src/core/examples.ts` and import them into `src/core/prompts.ts`.
- Ensure output matches LinkedIn constraints (exactly 2 emojis, no raw markdown asterisks, whiteboard delivery).
