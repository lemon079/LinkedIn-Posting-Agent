# Praxis — Project Overview

> A full-stack AI agent and web dashboard that drafts, validates, and publishes technical LinkedIn posts on-demand.

---

## What the Project Is About

Praxis is a **LinkedIn posting automation tool** built for engineers, technical leaders, and professionals who want to maintain an active LinkedIn presence without spending hours writing. It combines a **multi-step AI agent** (powered by LangGraph) with a **modern web dashboard** (built on Next.js 16) to take a user from topic idea → polished draft → live LinkedIn post in under a minute.

The core idea: you provide a topic and optional context, and an AI agent researches, drafts, reviews, safety-checks, and validates a LinkedIn post — then lets you edit it freely before publishing it directly to your LinkedIn profile with one click.

### Who It's For

- Software engineers who want to share technical insights but don't have time to write
- Technical leaders building a personal brand on LinkedIn
- HR, Sales, and Marketing professionals who need domain-specific content
- Anyone who wants AI-assisted drafting with full manual editing control

---

## What It Does

### The AI Agent Pipeline

At the heart of Praxis is a **stateful LangGraph agent** that runs a 5-node pipeline to produce each post:

```
START → generateDraft → reviewAndRefine → runGuardrails → validatePost → publishPost → END
```

| Node | Purpose |
|:---|:---|
| **generateDraft** | Takes the topic + context, selects a domain-specific prompt (Engineering, HR, Sales, Marketing, or General), and asks the LLM to produce an outline and initial draft in a single pass. |
| **reviewAndRefine** | Acts as a senior editor — reviews the draft against strict formatting rules (100–150 words, max 2 emojis, no Markdown syntax, no corporate buzzwords) and outputs a polished version. |
| **runGuardrails** | Safety check — sends the draft through the LLM with a simple SAFE/UNSAFE classification to block harmful or inappropriate content. |
| **validatePost** | Verifies the post is between 1–3000 characters. If it's too long, the graph loops back to `reviewAndRefine` for another edit pass. |
| **publishPost** | Publishes the final text (and any attached images) to LinkedIn via the UGC Share API. This node has a **human-in-the-loop breakpoint** — it pauses before publishing so the user can review and edit. |

### Domain-Aware Prompting

The system automatically infers the domain from the topic using keyword matching, or the user can manually select one. Each domain has:

- **Custom specificity descriptions** — what kind of concrete details to include
- **Custom grounding rules** — how to anchor the post in real-world evidence
- **Few-shot examples** — 1–5 high-quality example posts that define the voice and style

Supported domains: **Engineering & CS**, **HR / People**, **Sales**, **Marketing**, **General / Personal**

### Hook Deduplication

The system tracks the opening line (hook) of every generated post in a local JSON file (`.data/hooks.json`). On each new generation, recent hooks are injected into the prompt with explicit instructions to avoid reusing the same rhetorical devices. This prevents the AI from producing repetitive-sounding posts over time.

### Multi-Provider LLM Support

Users can choose their AI provider at runtime:

| Provider | Models |
|:---|:---|
| **Google Gemini** (default) | gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-flash, gemini-1.5-pro |
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| **Anthropic** | claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus |
| **Ollama** (desktop only) | Any locally installed model (auto-discovered) |

Custom model names are also supported for any cloud provider.

### Image Attachments

Users can attach up to **20 images** per post (JPEG, PNG, or WebP, max 4 MB each). Images can be added via:

- File picker button
- Drag-and-drop onto the editor area

Images are uploaded to Supabase Storage (if configured) or stored as base64 locally. When publishing, images are sent alongside the post text to the LinkedIn UGC API.

### Cloud Settings Sync

When signed in via LinkedIn OAuth, user credentials and API keys are **AES-256 encrypted** server-side and synced to a Supabase PostgreSQL database. This means settings persist across devices. Without sign-in, settings fall back to `localStorage`.

### Native App Support

Praxis ships in three forms:

- **Web app** — Next.js served from any hosting provider
- **Desktop app** — Tauri wrapper (Rust-based) that runs as a native desktop application
- **Mobile app** — Capacitor container for Android and iOS

The native apps run as static SPAs that point at a hosted Next.js backend via `NEXT_PUBLIC_API_URL`.

---

## How the Frontend Looks

The UI is a **single-page dashboard** with a clean, professional design. It uses the **DM Sans** font, a muted LinkedIn-inspired color palette (`#f3f2ef` background, `#6A89A7` brand blue), and Shadcn UI components throughout.

### Page Layout

The main page is a responsive **5-column CSS grid**:

```
┌──────────────────────────────────────────────────────┐
│  Header Bar                                [⚙ Settings] │
├────────────────┬─────────────────────────────────────┤
│                │                                     │
│  Control Panel │  Editor / Preview Panel             │
│  (2 cols)      │  (3 cols)                           │
│                │                                     │
│  ┌───────────┐ │  ┌───────────────────────────────┐  │
│  │ Domain    │ │  │ Reasoning Accordion           │  │
│  │ Selector  │ │  │ (Chain-of-Thought display)    │  │
│  ├───────────┤ │  ├───────────────────────────────┤  │
│  │ Post      │ │  │ Draft Text Editor             │  │
│  │ Topic     │ │  │ (editable textarea)           │  │
│  ├───────────┤ │  │                               │  │
│  │ Context   │ │  │ Character counter  │ Preview  │  │
│  │ (expand.) │ │  │ (circular SVG)     │ button   │  │
│  ├───────────┤ │  ├───────────────────────────────┤  │
│  │ ✨ Generate │  │  │ Attachment bar               │  │
│  │ Draft     │ │  │ (drag & drop images)          │  │
│  └───────────┘ │  └───────────────────────────────┘  │
│                │                                     │
├────────────────┴─────────────────────────────────────┤
│  Settings Panel (Sheet on desktop, Drawer on mobile) │
└──────────────────────────────────────────────────────┘
```

On mobile (`< 1024px`), the layout collapses to a single column. The Control Panel becomes a collapsible accordion with a chevron toggle.

### Component Breakdown

#### 1. Header (`Header.tsx`)
A sticky top bar with:
- The **"Praxis"** brand name in the brand-blue accent color
- A **"Configure Credentials"** button (gear icon) that opens the settings panel
- Both elements are disabled during generation to prevent mid-stream config changes

#### 2. Control Panel (`ControlPanel.tsx`)
A card on the left side containing the post configuration:
- **Domain / Persona selector** — dropdown to pick Engineering, HR, Sales, Marketing, General, or Auto-detect
- **Post Topic** — text input (required) for the subject of the post
- **Additional Context** — an expandable section with two textareas:
  - "What happened?" — for describing a scenario or event
  - "What did you take away?" — for the key lesson or insight
- **Generate Draft** button — brand-blue, full-width, with a pulsing sparkle icon. Disabled until a topic is entered.

On mobile, the entire panel collapses after tapping "Generate Draft" to give full screen space to the editor.

#### 3. Editor Panel (`EditorPanel.tsx`)
The main content area, a white card with:

- **Toolbar row** containing:
  - "Interactive Editor" label
  - Circular SVG **character counter** (ring progress indicator showing usage against 3000-char LinkedIn limit — turns yellow at 2800, red at 3000+)
  - **Preview** button that opens a dialog with the LinkedIn feed simulation
  - **Publish** button (brand-blue, sends to LinkedIn)

- **Reasoning accordion** (`EditorReasoning.tsx`) — shown during and after generation:
  - Displays the AI's chain-of-thought steps (Planning & Drafting, Review & Polish, Guardrails)
  - Auto-opens when generation starts, auto-collapses when the answer starts streaming
  - Each step is rendered as Markdown with syntax highlighting
  - Shows total character count of reasoning output
  - Collapsible with a chevron toggle

- **Streaming skeleton / Editable textarea**:
  - During generation: a skeleton overlay with shimmer animation shows three placeholder lines that progressively fill in with the AI's output via a character-by-character typewriter effect (6ms per character)
  - After generation: switches to a standard editable `<textarea>` where the user can freely edit the draft

- **Attachment bar**:
  - Shows uploaded images as pill-shaped attachment cards with thumbnail preview, filename, and a delete button
  - Each attachment can be clicked to open a full-size preview in a dialog
  - An "Attach image" card is always visible when fewer than 20 files are attached
  - Supports drag-and-drop

#### 4. LinkedIn Feed Preview (`LinkedInFeed.tsx`)
A high-fidelity simulation of how the post will look in the LinkedIn feed:
- Shows a circular avatar with "PR" initials and the name "Praxis"
- Renders the full post text with `white-space: pre-wrap` to preserve line breaks
- Displays attached images in a **responsive mosaic grid** that mirrors LinkedIn's own image layout:
  - 1 image: full-width landscape
  - 2 images: side-by-side squares
  - 3 images: one large left + two stacked right
  - 4+ images: 2×2 grid with a "+N" overlay on the fourth tile

#### 5. Settings Panel (`SettingsPanel.tsx`)
A slide-out panel (Sheet on desktop, Drawer on mobile) with three sections:

- **Account Sync** — LinkedIn OAuth sign-in, or local-mode indicator
- **AI Engine Settings** — provider dropdown, API key input, model selector (with custom model name support), Ollama URL field, and a "Test Connection" button with success/error feedback
- **LinkedIn Account** — shows connection status with the user's LinkedIn URN

The panel footer shows an "Apply Settings" button and a note about whether settings are cloud-synced or local-only.

#### 6. Auth Form (`AuthForm.tsx`)
A minimal LinkedIn OAuth button shown in the Settings panel and in a modal dialog when the user tries to publish without being signed in.

### Visual Design Language

| Aspect | Detail |
|:---|:---|
| **Typography** | DM Sans (Google Fonts), with font-weight ranging from 400 (body) to 700 (headings) |
| **Colors** | LinkedIn-inspired warm gray background (`#f3f2ef`), white cards, muted blue accent (`#6A89A7`), darker hover state (`#384959`) |
| **Corners** | Generous `rounded-2xl` (1rem) on cards and panels, `rounded-xl` on inputs and buttons |
| **Shadows** | Subtle `shadow-sm` on cards, `shadow-lg` on the Publish button and settings panel |
| **Animations** | `fadeInUp` entrance animation on all major sections, shimmer sweep on loading skeletons, pulsing sparkle icon on the Generate button, CSS Grid `grid-template-rows` transitions for smooth accordion collapse/expand |
| **Responsive** | Single-column below `lg` (1024px), collapsible Control Panel on mobile, Drawer instead of Sheet for settings on mobile |

### Interaction Flow

1. **User opens dashboard** → sees the Control Panel on the left and an empty state ("Configure parameters and generate a post draft") on the right
2. **User fills in a topic** → the Generate button enables
3. **User clicks Generate** → the reasoning accordion opens and streams the AI's thinking process in real-time. Shimmer skeleton lines appear in the editor area.
4. **Draft arrives** → the reasoning accordion collapses, and the draft text appears with a typewriter animation
5. **User edits the draft** → the textarea is fully editable, character counter updates live
6. **User attaches images** → thumbnails appear in the attachment bar below the editor
7. **User clicks Preview** → a dialog opens showing the LinkedIn feed simulation
8. **User clicks Publish** → if not signed in, a login modal appears; otherwise the post is sent to LinkedIn and a success banner appears with a link to the live post

---

## Tech Stack Summary

| Layer | Technology |
|:---|:---|
| **Frontend** | Next.js 16 (App Router), React 19, Shadcn UI, Tailwind CSS 4, DM Sans |
| **AI Agent** | LangGraph (StateGraph with MemorySaver), multi-provider LLM support |
| **Backend** | Next.js API Routes (serverless), streaming SSE for draft generation |
| **Auth** | LinkedIn OAuth 2.0 + Supabase Auth (magic link OTP) |
| **Storage** | Supabase (PostgreSQL for settings, Storage for images), localStorage fallback |
| **Encryption** | AES-256 server-side encryption for stored credentials |
| **Desktop** | Tauri (Rust) |
| **Mobile** | Capacitor (Android + iOS) |
| **Analytics** | Vercel Analytics |
