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

## 💻 Native Desktop Application (Tauri v2)

Praxis can be run as a cross-platform native desktop app powered by **Tauri v2**:

```bash
npm run tauri:dev     # Launch Next.js dev server + native desktop window
npm run tauri:build   # Package native installers (.exe, .msi, .dmg, .AppImage)
```

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
User Browser / Desktop App
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

---

## ❓ Frequently Asked Questions (FAQ)

### 1. How do I connect my LinkedIn account to publish directly?
Go to **Settings** (gear icon) in the dashboard or sidebar, scroll to **LinkedIn Account**, and click **Connect LinkedIn**. Complete the OAuth prompt to grant post publishing permissions.

### 2. Can I use local AI models like Ollama?
Yes! Local Ollama models are fully supported when running the **Praxis Desktop App** (`npm run tauri:dev`). Ensure Ollama is active on `http://localhost:11434`, select **Ollama** in AI Provider settings, and input your pulled model name (e.g., `llama3.1`, `qwen2.5`). *(Ollama option is disabled in web browser mode due to localhost cross-origin policies).*

### 3. Are my API keys and LinkedIn credentials secure?
Yes. All user keys and tokens are encrypted at rest using **AES-256-GCM** (Authenticated Encryption with Associated Data) with a 32-byte master key, 12-byte random IVs, and GCM authentication tags. Credentials are never logged or stored in plaintext.

### 4. What happens if my browser tab closes while drafting?
Praxis includes state auto-hydration. Your topic, custom instructions, uploaded attachments, reasoning steps, and draft text are saved locally and restored automatically when you reopen the app.

### 5. What media file types and sizes are supported for attachments?
You can attach up to 20 files per post (`.png`, `.jpg`, `.webp` images or `.pdf` documents up to 10MB each). Files are registered via the LinkedIn UGC Media API and published alongside your post.

### 6. How does Chain-of-Thought (CoT) reasoning work?
The LangGraph agent executes multi-stage reasoning nodes (`planDraft` → `researchGrounding` → `generateInitialDraft` → `reviewAndRefine`). You can inspect each node's intermediate output in the collapsible CoT accordion before final generation.

