# Context: Phase 2 React Dashboard UI

This document captures the scope, requirements, and design choices for creating the web dashboard frontend.

## Goals
- **UI-01**: Select/enter topics and context parameters to generate drafts.
- **UI-02**: Review generated drafts in a high-fidelity LinkedIn feed simulation layout.
- **UI-03**: Edit the draft text manually with character tracking before publishing.
- **UI-04**: Toggle dry-run mode settings.

---

## Architectural Decisions

### 1. Project Location
- The React application will reside in a new subdirectory named `client/` at the project root.
- The dev command for the client will run on `http://localhost:5173`, and it will communicate with the Express server running on `http://localhost:3000`.

### 2. Styling System
- We will use **Tailwind CSS v4** (using the new native Vite compilation plugin `@tailwindcss/vite`).
- **Shadcn UI** components will be utilized for consistent, polished, and accessible UI controls (buttons, inputs, select, switch, cards, alert dialogue, etc.).
- Slate dark-mode aesthetics will be applied using Tailwind CSS classes.

### 3. API Integration
- We will configure a **Vite Proxy** in `client/vite.config.ts` to redirect `/api` requests to `http://localhost:3000`. This allows using relative paths like `/api/draft` and `/api/publish` in frontend fetch requests.

---

## Design System & Tokens
- **Theme**: Slate Dark Mode
- **Typography**: Inter (imported from Google Fonts)
- **Palette**:
  - Background: `#0B0F19` (Deep slate)
  - Card Background: `#1F2937` (Glassmorphic dark grey)
  - Accent/Primary: `#0A66C2` (LinkedIn blue)
  - Text Primary: `#F9FAFB` (Off-white)
  - Border/Muted: `#374151`
- **Transitions**: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` for hover and micro-animations.
