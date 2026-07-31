# Praxis — LinkedIn Daily Posting Agent

> A stateful AI agent and web dashboard that drafts, grounds, validates, and publishes technical LinkedIn posts on-demand.

---

## ✨ Features

- **AI-Powered Drafting** — LangGraph stateful agent powered by Gemini, OpenAI, Anthropic, or local Ollama model orchestrates post generation.
- **Transparent Chain-of-Thought (CoT)** — Multi-node reasoning steps (`planDraft` → `researchGrounding` → `generateInitialDraft` → `reviewAndRefine`) let you inspect the AI's internal process before final output generation, complete with an interactive accordion UI display.
- **Rich Interactive Editor** — Fully editable draft view with real-time LinkedIn feed preview, streaming text animation, and tab switching.
- **Multi-Image Attachments** — Upload up to 20 images per post via drag-and-drop or file picker; images upload directly to LinkedIn media storage and publish alongside draft copy via the UGC API.
- **State Persistence & Session Recovery** — Automatically saves draft topic, context, reasoning steps, and attached files. Gracefully handles page reloads and browser tab closures with unsaved draft restoration and interruption alerts.
- **One-Click Publishing** — Publishes posts directly to your LinkedIn profile via OAuth using the LinkedIn UGC Share API.
- **Cloud Settings & Multi-User Sync** — User credentials and API keys are AES-256-GCM encrypted at rest and synced with Supabase PostgreSQL storage.

---

<<<<<<< HEAD
## ⚙️ Configuration
=======
## 📂 Project Structure

```
├── public/               # Static assets & SVG favicon
├── src/
│   ├── app/              # Next.js App Router pages + API route handlers
│   │   ├── api/          # Serverless route handlers (/draft, /publish, /user/settings, etc.)
│   │   ├── globals.css   # Tailored Vanilla CSS design system & micro-animations
│   │   └── page.tsx      # Main application page dashboard
│   ├── components/       # React UI components (EditorPanel, ControlPanel, LinkedInFeed, etc.)
│   │   └── ui/           # Radix UI primitives & custom components
│   ├── core/             # State annotations & ghostwriter prompt templates
│   ├── graph/            # LangGraph multi-node graph definition
│   │   └── nodes/        # Graph execution nodes (generatePost, validatePost, publishPost)
│   ├── hooks/            # Main application state hook (useAgent)
│   ├── interfaces/       # Strongly-typed TypeScript interfaces
│   ├── lib/              # API clients, Supabase helpers, and utilities
│   └── services/         # LinkedIn REST client & LLM provider instantiations
├── .env.example          # Environment variable template
├── package.json          # Dependencies & scripts
└── tsconfig.json         # TypeScript configuration
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` and configure your API keys and credentials:

| Variable | Description | Required |
| :--- | :--- | :--- |
| `GOOGLE_API_KEY` | Google Gemini API key (default provider) | Yes |
| `TAVILY_API_KEY` | Tavily Search API key (web grounding) | Optional |
| `SUPABASE_URL` | Supabase project URL for authentication & encrypted settings | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM credential encryption | Yes |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth App Client ID | Yes |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth App Client Secret | Yes |
| `LINKEDIN_REDIRECT_URI` | OAuth callback URI (e.g. `http://localhost:3000/api/auth/linkedin/callback`) | Yes |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build & Production Start

```bash
npm run build
npm start
```

---

## 🧪 Testing & Code Quality

```bash
npm run lint       # Run ESLint validation
npm run tests      # Run Jest unit test suite
```

---

## 🏗️ System Architecture

```
User Browser Dashboard
         │
         ▼
Next.js App Router (React SPA)
 ├── Dashboard Page (src/app/page.tsx)
 └── API Route Handlers (src/app/api/*)
         │
         ▼
LangGraph Agent Engine
 ├── planDraft Node
 ├── researchGrounding Node (Tavily Grounding)
 ├── generateInitialDraft Node (Gemini / OpenAI / Anthropic / Ollama)
 ├── reviewAndRefine Node
 └── publishPost Node (LinkedIn UGC Share API)
```
