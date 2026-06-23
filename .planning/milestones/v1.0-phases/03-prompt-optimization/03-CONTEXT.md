# Context: Phase 3 Prompt Optimization

This document captures the scope, requirements, and design choices for optimizing the system prompt of the LinkedIn Daily Posting Agent.

## Goals
- **PRMPT-01**: User receives highly styled drafts from Gemini 2.5 Flash using few-shot technical post examples embedded directly in prompts system.

---

## Architectural Decisions

### 1. Decomposing Prompts Module
- To adhere to the strict project-wide coding rule of **under 80 lines per file**, we cannot place the full prompt and all 3 detailed few-shot examples in a single file `src/core/prompts.ts`.
- We will create a new file `src/core/examples.ts` containing the few-shot examples as exported constants (each example is around 15-20 lines, fitting well under the 80-line limit).
- We will update `src/core/prompts.ts` to import these examples and build the final `SYSTEM_PROMPT`.

### 2. Format Requirements for LinkedIn
- **Whiteboard-style delivery:** Conversational, engineering-first tone (no thought-leader jargon or corporate buzzwords).
- **Correct line spacing:** Explicit blank lines between paragraphs.
- **No markdown asterisks:** Absolutely no raw asterisks (`**` or `__`) or headers (`#` inside paragraph, hashtags are fine at the end).
- **Emoji controls:** Exactly 2 inline emojis per post. None of the overused ones (clapping hands, rocket, fire, lightbulb).
- **Length:** 100-150 words.
- **Hook & End:** Hook under 12 words naming the tech. Ends with a question only a hands-on engineer would find meaningful.

---

## Few-Shot Examples
- Example 1: Distributed Systems (Kafka consumer group rebalances / timeout config gotchas).
- Example 2: Database Storage (PostgreSQL MVCC bloat / index performance / autovacuum scale factor).
- Example 3: Frontend Performance (React Suspense nested waterfalls / parent routing parallel fetches).
