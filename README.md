# Praxis

A full-stack AI agent and web dashboard that drafts, validates, and publishes technical LinkedIn posts on-demand. Built with Next.js, LangGraph, and Supabase — runs as a web app, desktop app (Tauri), or mobile container (Capacitor).

---

## 📥 Downloads & Native Installers

Install Praxis directly on your Windows Desktop or Android device:

| Platform | Download Link | File Format | Release Badge |
| :--- | :--- | :--- | :--- |
| **Windows Desktop** | [**Download Setup Installer (.exe)**](https://github.com/lemon079/LinkedIn-Posting-Agent/releases/latest) | `.exe` Setup / `.msi` | [![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/lemon079/LinkedIn-Posting-Agent/releases/latest) |
| **Android Mobile** | [**Download Android Package (.apk)**](https://github.com/lemon079/LinkedIn-Posting-Agent/releases/latest) | `.apk` Binary | [![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/lemon079/LinkedIn-Posting-Agent/releases/latest) |

### 💻 Windows Setup (.exe)
1. Download **`Praxis-Setup-x64.exe`** from [Latest GitHub Releases](https://github.com/lemon079/LinkedIn-Posting-Agent/releases/latest).
2. Double-click the installer wizard to complete installation.
3. Launch **Praxis**, open **Settings** (⚙️), and enter your **Backend Server URL** (e.g., `https://linkedin-agent.vercel.app`).

### 📱 Android Setup (.apk)
1. Download **`praxis-release.apk`** on your mobile device from [Latest GitHub Releases](https://github.com/lemon079/LinkedIn-Posting-Agent/releases/latest).
2. Tap the downloaded file to install (enable *"Install from Unknown Sources"* if prompted).
3. Launch **Praxis Mobile**, open Settings, and set your **Backend Server URL**.

---

## ✨ Features

- **AI-powered drafting** — LangGraph agent with Gemini, OpenAI, or Anthropic orchestrates post generation
- **Transparent Chain-of-Thought** — Explicit multi-node LangGraph reasoning lets you inspect the AI's internal process before final output generation, separated logically with a UI toggle
- **Rich editing experience** — Fully editable draft with LinkedIn-style preview, character-by-character streaming animation, and tab-based edit/preview toggle
- **Multi-image attachments** — Upload up to 20 images per post via drag-and-drop or file picker; images publish alongside copy to LinkedIn via the UGC API
- **Modern Responsive UI** — Built with Shadcn UI, DM Sans typography, and native CSS Grid transitions for a lightweight, mobile-first collapsible settings experience
- **One-click publishing** — Posts directly to your LinkedIn profile via OAuth using the UGC Share API
- **Cloud settings sync** — User credentials and API keys are AES-encrypted and synced to Supabase; settings persist across devices
- **Native app support** — Ships as a Tauri desktop app and Capacitor mobile container alongside the web portal

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
| :--- | :--- |
| `GOOGLE_API_KEY` | Gemini API key (default AI provider) |
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
