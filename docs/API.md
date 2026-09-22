<!-- generated-by: gsd-doc-writer -->
# API Reference

Praxis exposes HTTP REST endpoints and Server-Sent Events (SSE) streaming routes built using Next.js App Router route handlers.

---

## Authentication

Praxis supports both session-based authentication and secure OAuth credential delegation:

1. **User Session Authentication:**
   Protected endpoints read standard Supabase JWT Bearer tokens from the `Authorization: Bearer <token>` header or authenticated browser session cookies.
2. **LinkedIn OAuth 2.0 (3-Legged):**
   - **Initiate:** `GET /api/auth/linkedin` generates a cryptographically random 24-byte CSRF state nonce stored in an `httpOnly`, `sameSite=lax` cookie (`li_oauth_state`) and redirects to LinkedIn's authorization portal with scopes `w_member_social`, `openid`, `profile`, and `email`.
   - **Callback:** `GET /api/auth/linkedin/callback` validates the state nonce, exchanges the authorization code for a bearer access token, retrieves the authenticated member URN (`urn:li:person:...`), and encrypts credentials into `user_settings` using AES-256-GCM.
3. **API Keys & Model Credentials:**
   Provider API keys (Gemini, OpenAI, Anthropic) entered in the client are encrypted at rest with AES-256-GCM before database insertion.

<!-- VERIFY: Live LinkedIn OAuth Client ID and Redirect URIs must match your registered settings in the LinkedIn Developer Portal. -->

---

## Endpoints Overview

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/draft` | Streams LangGraph agent execution and draft generation via Server-Sent Events (SSE). | Optional (falls back to server env) |
| `POST` | `/api/publish` | Resumes paused LangGraph thread to upload media and publish post to LinkedIn. | Optional (uses OAuth or server keys) |
| `POST` | `/api/health-check` | Tests connectivity and credentials for Gemini, OpenAI, Anthropic, or Ollama. | No |
| `GET` | `/api/auth/linkedin` | Initiates 3-legged LinkedIn OAuth 2.0 flow with CSRF protection. | No |
| `GET` | `/api/auth/linkedin/callback` | Exchanges OAuth code for access token and stores encrypted credentials. | No |
| `GET` | `/api/media/upload/sign` | Generates a presigned storage upload URL for image or PDF attachments. | Yes |
| `GET` | `/api/user/settings` | Retrieves decrypted user preferences, model settings, and connection status. | Yes |
| `POST` | `/api/user/settings` | Persists user settings, encrypting sensitive API keys and OAuth tokens. | Yes |

---

## Request & Response Formats

### 1. `POST /api/draft` (SSE Streaming)

#### Request Body
```json
{
  "userPrompt": "Refactoring our core caching layer to Redis Cluster",
  "archetype": "incident_teardown",
  "tone": "conversational",
  "domain": "backend",
  "threadId": "optional-thread-uuid-for-resumption"
}
```

#### Supported Archetypes
- `incident_teardown`
- `contrarian_take`
- `playbook`
- `gotcha`
- `decision_matrix`

#### Supported Tones
- `conversational`
- `authoritative`
- `provocative`
- `reflective`

#### Streaming SSE Protocol
Returns `Content-Type: text/event-stream; charset=utf-8` emitting JSON-encoded events:
```text
data: {"type": "thread", "threadId": "123e4567-e89b-12d3-a456-426614174000"}

data: {"type": "node_start", "node": "analyzeIntake", "title": "Analyzing Your Input"}

data: {"type": "token", "node": "generateDraft", "content": "Last week our Redis cluster..."}

data: {"type": "critique", "critique": {"score": 8.5, "strengths": ["Strong hook", "Clear metrics"], "improvements": []}}

data: {"type": "final", "content": "Full finished LinkedIn post text...", "threadId": "123e4567-e89b-12d3-a456-426614174000"}
```

---

### 2. `POST /api/publish`

#### Request Body
```json
{
  "threadId": "123e4567-e89b-12d3-a456-426614174000",
  "draft": "Final approved post text to publish on LinkedIn (max 3,000 characters).",
  "files": [
    {
      "name": "architecture-diagram.png",
      "type": "image/png",
      "storagePath": "user_id/uploads/arch-123.png"
    }
  ]
}
```

#### Response (Success: 200 OK)
```json
{
  "ok": true,
  "postId": "urn:li:share:7123456789012345678",
  "postUrl": "https://www.linkedin.com/feed/update/urn:li:share:7123456789012345678"
}
```

---

### 3. `POST /api/health-check`

#### Request Body
```json
{
  "provider": "google",
  "apiKey": "AIzaSy...",
  "model": "gemini-3.7-flash"
}
```

#### Response
```json
{
  "ok": true,
  "latencyMs": 312,
  "model": "gemini-3.7-flash"
}
```

---

## Error Codes

When an API route encounters an error, it returns a standard JSON error payload:

```json
{
  "error": "Human-readable error description"
}
```

### HTTP Status Codes
- `200 OK`: Request succeeded.
- `400 Bad Request`: Invalid parameters (e.g. missing `threadId`, draft exceeding 3,000 characters, or missing `mimeType`).
- `401 Unauthorized`: Missing or invalid Bearer token / expired session.
- `429 Too Many Requests`: Client exceeded sliding-window rate limit. Returns `Retry-After: <seconds>` header.
- `500 Internal Server Error`: Unhandled server exception (all sensitive API keys and tokens are automatically redacted by `src/lib/logger.ts`).

### Stream Error Codes (`StreamErrorCode`)
Transmitted inside SSE `error` events:
- `QUOTA_EXCEEDED`: LLM provider rate limit or quota exhaustion.
- `RATE_LIMIT`: Client or upstream rate limiting.
- `MODEL_OVERLOADED`: Upstream provider capacity degradation.
- `TIMEOUT`: Request exceeded deadline budget (60s global timeout).
- `CONTENT_UNSAFE`: Guardrail node flagged prompt or post as violating content safety.
- `AUTH_ERROR`: Invalid or expired API credentials.
- `UNKNOWN`: Unclassified runtime exception.

---

## Rate Limits

Praxis enforces in-memory sliding-window rate limiting via [`src/lib/security/rateLimit.ts`](file:///d:/Work/linkedin-agent/src/lib/security/rateLimit.ts):

| Route | Window | Limit | Target |
|---|---|---|---|
| `POST /api/draft` | 60 seconds | 30 requests | Client IP |
| `POST /api/health-check` | 60 seconds | 30 requests | Client IP |
| `POST /api/publish` | 60 seconds | 10 requests | Client IP |

When a limit is reached, the API responds with HTTP 429 and includes a `Retry-After` header indicating the seconds until reset.
