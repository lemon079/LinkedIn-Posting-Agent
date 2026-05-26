# LinkedIn Daily Posting Agent — Tech Spec

## Overview

A minimal LangGraph agent that takes a topic as input, generates a LinkedIn post, and publishes it to your account. Runs on a daily schedule via a cron job.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Agent framework | `@langchain/langgraph` | Stateful graph, easy to extend later |
| LLM | Gemini 2.5 Flash (`@langchain/google`) | Free tier, strong writing quality — replaces deprecated `@langchain/google-genai` |
| LinkedIn API | LinkedIn REST API (OAuth 2.0) | Official posting endpoint |
| Scheduler | `node-cron` | Lightweight, in-process cron for Node |
| Env management | `dotenv` | Standard |
| Runtime | Node.js 20+ / TypeScript 5+ | LangGraph JS requirement |

---

## Architecture

```
[Input: topic (string)]
        │
        ▼
┌───────────────────┐
│  generate_post    │  LLM node — writes LinkedIn post from topic
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  validate_post    │  Checks length (≤3000 chars), not empty
└───────────────────┘
        │ pass / fail
        ▼
┌───────────────────┐
│  publish_post     │  Calls LinkedIn API, stores result
└───────────────────┘
        │
        ▼
[Output: post_url or error]
```

Graph has three nodes and one conditional edge (validate → generate retry on fail, max 2 retries).

---

## State Schema

```typescript
interface AgentState {
  topic: string;
  postContent: string | null;
  postUrl: string | null;
  retries: number;
  error: string | null;
}
```

---

## Node Definitions

### `generatePost`
- Input: `state.topic`
- Calls Gemini 2.5 Flash via `ChatGoogle` (`@langchain/google`) with a fixed system prompt (see Prompt section)
- Returns `{ postContent: string }`

### `validatePost`
- Checks `postContent.length <= 3000`
- Checks content is non-empty
- Returns `"publish"` or `"retry"` (conditional edge)
- Increments `state.retries`; after 2 failures → `END` with error

### `publishPost`
- POSTs to `https://api.linkedin.com/v2/ugcPosts`
- Reads `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` from env
- Returns `{ postUrl: string }` on success, `{ error: string }` on failure

---

## LLM Prompt

```
System:
You are a professional LinkedIn ghostwriter. Write posts that are:
- Concise (150–300 words)
- One clear insight or takeaway
- No hashtag spam (max 3 relevant hashtags at the end)
- No corporate buzzwords ("synergy", "leverage", "circle back")
- First-person, conversational tone
- No emojis unless the topic calls for it

Return only the post text. No preamble, no quotes around it.
```

User message: `Write a LinkedIn post about: {topic}`

---

## File Structure

```
linkedin-agent/
├── src/
│   ├── agent.ts          # LangGraph graph definition
│   ├── nodes.ts          # Node functions (generate, validate, publish)
│   ├── linkedin.ts       # LinkedIn API client (thin wrapper)
│   ├── scheduler.ts      # node-cron entry point
│   ├── prompts.ts        # System prompt constant
│   └── config.ts         # Env var loading + validation
├── .env                  # Secrets (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Environment Variables

```env
GOOGLE_API_KEY=AIza...
LINKEDIN_ACCESS_TOKEN=AQ...
LINKEDIN_PERSON_URN=urn:li:person:XXXXXXX
TOPIC=AI trends in product management
```

---

## LinkedIn API Call

```typescript
POST https://api.linkedin.com/v2/ugcPosts
Authorization: Bearer {LINKEDIN_ACCESS_TOKEN}
Content-Type: application/json

{
  "author": "urn:li:person:{PERSON_ID}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": { "text": "{postContent}" },
      "shareMediaCategory": "NONE"
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

Response `201 Created` → extract `x-linkedin-id` header for the post URL.

---

## Scheduling

**Option A — system cron (simplest, no long-running process):**
```bash
# Run every day at 9:00 AM
0 9 * * * cd /path/to/linkedin-agent && npx tsx src/scheduler.ts
```

**Option B — node-cron (in-process, long-running):**
```typescript
import cron from "node-cron";
cron.schedule("0 9 * * *", () => runAgent(process.env.TOPIC!));
```

`scheduler.ts` reads `TOPIC` from env, or from a `topics.txt` file — one topic per line, shifting off the first one each day.

---

## Dependencies

```json
{
  "dependencies": {
    "@langchain/google": "^0.1.12",
    "@langchain/core": "^1.1.48",
    "@langchain/langgraph": "^1.3.2",
    "dotenv": "^16.0.0",
    "node-cron": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/node-cron": "^3.0.0"
  }
}
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

---

## Auth Setup (one-time)

1. Create a LinkedIn app at [developer.linkedin.com](https://developer.linkedin.com)
2. Request the `w_member_social` OAuth scope
3. Complete the OAuth 2.0 Authorization Code flow to get your `access_token`
4. Get your Person URN: `GET https://api.linkedin.com/v2/userinfo` → `sub` field
5. Put both in `.env`

> ⚠️ LinkedIn access tokens expire after 60 days. Regenerate manually or implement refresh token flow.

---

## What's Intentionally Left Out

- No database (stateless — each run is independent)
- No web UI (topic is an env var or CLI arg)
- No image/media attachment
- No multi-account support
- No approval step before posting

These are easy to add later once the core works.

---

## Running It

```bash
# Install
npm install

# One-off post
TOPIC="Why async communication makes remote teams faster" npx tsx src/scheduler.ts

# Start daily schedule (Option B)
npx tsx src/scheduler.ts --schedule
```
