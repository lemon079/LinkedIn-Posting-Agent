# LinkedIn Posting Agent

A full-stack AI agent and web dashboard that drafts, validates, and publishes technical LinkedIn posts on-demand. Built with Next.js, LangGraph, and Supabase — runs as a web app, desktop app (Tauri), or mobile container (Capacitor).

---

## ✨ Features

- **AI-powered drafting** — LangGraph agent with Gemini, OpenAI, or Anthropic orchestrates post generation with optional Tavily web-search grounding
- **Rich editing experience** — Fully editable draft with LinkedIn-style preview, character-by-character streaming animation, and tab-based edit/preview toggle
- **Multi-image attachments** — Upload up to 20 images per post via drag-and-drop or file picker; images publish alongside copy to LinkedIn via the UGC API
- **One-click publishing** — Posts directly to your LinkedIn profile via OAuth using the UGC Share API
- **Cloud settings sync** — User credentials and API keys are AES-encrypted and synced to Supabase; settings persist across devices
- **Native app support** — Ships as a Tauri desktop app and Capacitor mobile container alongside the web portal

---

## 📂 Project Structure

```
├── public/               # Static assets & favicon
├── scripts/              # Build helper scripts
├── src/
│   ├── app/              # Next.js App Router pages + serverless API routes
│   ├── components/       # React UI components (Editor, ControlPanel, Feed, etc.)
│   │   └── ui/           # shadcn/ui primitives (Button, Sheet, Attachment, etc.)
│   ├── core/             # State schemas & AI prompt templates
│   ├── graph/            # LangGraph nodes (generatePost, validatePost, publishPost)
│   ├── hooks/            # Client state hook (useAgent)
│   ├── lib/              # API helpers, Supabase client, utilities
│   ├── services/         # LinkedIn REST client & LLM instantiation
│   └── tests/            # Unit tests
├── src-tauri/            # Tauri desktop wrapper (Rust)
└── capacitor.config.ts   # Capacitor mobile wrapper config
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
| :--- | :--- |
| `GOOGLE_API_KEY` | Gemini API key (default AI provider) |
| `TAVILY_API_KEY` | Optional — enables web-search grounding during draft generation |
| `SUPABASE_URL` | Supabase project URL for user auth & settings sync |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side database access |
| `ENCRYPTION_KEY` | 32-byte hex key — encrypts user credentials before cloud sync |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth app Client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app Client Secret |
| `LINKEDIN_REDIRECT_URI` | OAuth callback URL (e.g. `http://localhost:3000/api/auth/linkedin/callback`) |
| `NEXT_PUBLIC_API_URL` | Public backend URL used by static native containers |

---

## 🚀 Development

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Lint & Type Check

```bash
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript
```

### Run Tests

```bash
npm run test
```

---

## 📦 Native App Builds

The native apps (Tauri/Capacitor) run as a static client-side SPA pointing at a hosted Next.js backend. Build the static frontend first:

```bash
npm run build:static
```

### Desktop (Tauri)

```bash
npx tauri dev       # Dev mode
npx tauri build     # Produce installer → src-tauri/target/release/bundle/
```

### Mobile (Capacitor)

```bash
npx cap add android
npx cap add ios
npm run build:static && npx cap sync
npx cap open android   # Opens Android Studio
npx cap open ios       # Opens Xcode
```

---

## 🏗️ Architecture

```
Browser / Native App
        │
        ▼
   Next.js App Router
   ├── /app            — React dashboard (Client Components)
   └── /app/api        — Serverless API routes (LangGraph, LinkedIn, Auth)
                │
                ▼
         LangGraph Agent
    generatePost → validatePost → publishPost
         │              │              │
      Gemini/        (skip if       LinkedIn
      OpenAI/         valid)        UGC API
      Anthropic
         │
      Tavily Search (optional grounding)
```

**State management**: `useAgent` hook owns all client state and calls `/api/agent/run` and `/api/agent/publish`. LangGraph persists state in-memory across the multi-step graph using `MemorySaver`.

**Settings sync**: On settings-panel close, credentials are encrypted with AES-256 and upserted to Supabase (if signed in), or saved to `localStorage` (local mode).

---

## 🔑 LinkedIn OAuth Setup

1. Create an app at [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Add `Sign In with LinkedIn using OpenID Connect` and `Share on LinkedIn` products
3. Set the OAuth redirect URI to `http://localhost:3000/api/auth/linkedin/callback` (or your production URL)
4. Copy the Client ID and Client Secret into `.env`
5. Open the dashboard, click **Configure Credentials → Sign In with LinkedIn**
