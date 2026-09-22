<!-- generated-by: gsd-doc-writer -->
# Configuration Reference

This guide details all environment variables, security configurations, database schemas, and runtime settings used across the Praxis platform.

---

## Environment Variables

Praxis loads configuration at startup through `src/config/env.ts`, reading from `.env` or system environment variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | Optional* | `""` | Google Gemini API key for `gemini-3.7-flash` and `gemini-2.5-flash` models. (*At least one LLM provider key is required to generate drafts). |
| `OPENAI_API_KEY` | Optional* | `""` | OpenAI API key for `gpt-4o` and structured reasoning models. |
| `ANTHROPIC_API_KEY` | Optional* | `""` | Anthropic API key for `claude-3-7-sonnet` and `claude-3-5-sonnet`. |
| `SUPABASE_URL` | **Required** | `""` | Base URL of your Supabase project (e.g. `https://<ref>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** | `""` | Supabase Service Role Secret key for server-side PostgreSQL queries and storage. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | `""` | Public Supabase URL exposed to the client-side browser runtime. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** | `""` | Public Supabase Anonymous Key for client-side queries and uploads. |
| `ENCRYPTION_KEY` | **Required** | `""` | 32-byte hexadecimal string (64 characters) used for AES-256-GCM symmetric encryption of API keys and tokens. Required in production. |
| `LINKEDIN_CLIENT_ID` | Optional | `""` | LinkedIn Developer App Client ID for OAuth 2.0 3-legged authentication. |
| `LINKEDIN_CLIENT_SECRET` | Optional | `""` | LinkedIn Developer App Client Secret for OAuth 2.0 token exchange. |
| `LINKEDIN_REDIRECT_URI` | Optional | `http://localhost:3000/api/auth/linkedin/callback` | OAuth redirect URI registered in your LinkedIn Developer Portal. |
| `LINKEDIN_ACCESS_TOKEN` | Optional | `""` | Static OAuth access token fallback for single-user or automated posting mode. |
| `LINKEDIN_PERSON_URN` | Optional | `""` | Static Member URN (e.g. `urn:li:person:abc123xyz`) fallback for single-user mode. |
| `LANGSMITH_TRACING` | Optional | `"false"` | Set to `"true"` to enable LangSmith tracing and APM observability. |
| `LANGSMITH_ENDPOINT` | Optional | `""` | LangSmith API endpoint (e.g. `https://api.smith.langchain.com`). |
| `LANGSMITH_API_KEY` | Optional | `""` | LangSmith API key for exporting traces. |
| `LANGSMITH_PROJECT` | Optional | `"Praxis"` | LangSmith project name tag. |
| `LANGCHAIN_CALLBACKS_BACKGROUND`| Optional | `"true"` | Process tracing callbacks asynchronously without blocking request loops. |
| `LOG_LEVEL` | Optional | `"info"` | Logging severity filter: `"debug"`, `"info"`, `"warn"`, or `"error"`. |
| `LOG_FORMAT` | Optional | `"pretty"` | Logging presentation format: `"pretty"` (colorized) or `"json"` (structured). |
| `NODE_ENV` | Optional | `"development"`| Runtime environment: `"development"`, `"test"`, or `"production"`. |

<!-- VERIFY: Production base URLs or custom enterprise LangSmith gateways must be configured in your hosting platform environment dashboard. -->

---

## Config File Format

Configuration loading and validation are managed in code:

### 1. `src/config/env.ts`
Exports the type-checked singleton `config: AppConfig`:

```typescript
import { config } from "@/config/env";

console.log(config.defaultProvider); // "google"
console.log(config.defaultModel);    // "gemini-3.7-flash"
```

### 2. Database Schema (`src/config/schema.sql`)
The PostgreSQL schema provisions four core tables and an object storage bucket:
- `user_settings`: Stores AES-256-GCM encrypted API keys and model configurations.
- `user_post_history`: Records published LinkedIn post URNs, URLs, character counts, and hook fingerprints.
- `agent_checkpoints`: Serialized LangGraph checkpoint state blobs keyed by `thread_id` and checkpoint sequence.
- `agent_checkpoint_writes`: Intermediate node writes and pending tasks.
- `temp-uploads` Storage Bucket: Ephemeral image and PDF attachments with public read access.

---

## Required vs Optional Settings

### Critical Settings (Startup Enforced)
1. **`ENCRYPTION_KEY` in Production:**
   If `NODE_ENV === "production"` and `ENCRYPTION_KEY` is not set, `loadConfig()` throws immediately:
   ```
   CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_KEY environment variable is required in production.
   ```
   To generate a secure 32-byte hex key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Supabase Connectivity:**
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be configured for the `SupabaseCheckpointer` and settings storage.

### Optional Fallbacks
- **Model Providers:** If `GOOGLE_API_KEY` is absent, the system falls back to `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or local `Ollama` if specified in user settings.
- **LinkedIn OAuth:** If OAuth credentials (`LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`) are not configured, single-user static fallbacks (`LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN`) can be supplied for testing and local scripting.

---

## Defaults

Default values codified within `src/config/env.ts` and module initializers:

| Parameter | Default Value | Defined In |
|---|---|---|
| `defaultProvider` | `"google"` | `src/config/env.ts` |
| `defaultModel` | `"gemini-3.7-flash"` | `src/config/env.ts` |
| `LINKEDIN_REDIRECT_URI` | `"http://localhost:3000/api/auth/linkedin/callback"` | `src/config/env.ts` |
| `LANGSMITH_PROJECT` | `"Praxis"` | `src/config/env.ts` |
| `LOG_LEVEL` | `"info"` | `src/lib/logger.ts` |
| `LOG_FORMAT` | `"pretty"` in dev, `"json"` in prod | `src/lib/logger.ts` |
| Refinement Pass Cap | `2` passes max | `src/modules/agent/graph.ts` |
| Critique Passing Score | `>= 7` out of 10 | `src/modules/agent/graph.ts` |
| Character Limit Range | `1` to `3000` chars | `src/modules/agent/nodes/validatePost.ts` |

---

## Per-Environment Overrides

### Development (`NODE_ENV=development`)
- `.env` file loaded automatically by `dotenv`.
- Uncaught exceptions log verbose human-readable traces (`LOG_FORMAT=pretty`).
- Local server runs on `http://localhost:3000`.

### Testing (`NODE_ENV=test`)
- In `test` mode, `src/config/env.ts` supplies a deterministic test encryption key if `ENCRYPTION_KEY` is omitted:
  ```typescript
  "praxis_test_encryption_key_32bytes_hex_123456"
  ```
- Jest sets `NODE_ENV=test` and loads mock checkpointers and API handlers.

### Production (`NODE_ENV=production`)
- Environment variables must be set via your host platform (e.g. Vercel Project Settings).
- `ENCRYPTION_KEY` must be provided as a real 64-character hex string.
- Logs format as structured JSON (`LOG_FORMAT=json`) for ingestion into cloud APM loggers.
