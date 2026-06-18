# Discussion Log: Phase 2 React Dashboard UI

## Topics Discussed

### 1. SPA Project Architecture
- **Decision:** Create a sub-project directory `client/` containing the Vite + React + TS workspace.
- **Rationale:** Keeps frontend codebase completely separate from backend Node/Express server code, avoiding dependency mix-ups and script command clutter in root `package.json`.

### 2. Styling Preference
- **Decision:** Use **Tailwind CSS v4** + **Shadcn UI** components.
- **Rationale:** The user explicitly requested using Tailwind and Shadcn to create a premium, consistent, and modular design. Tailwind v4 native Vite integration minimizes styling boilerplate config.

### 3. API Communication
- **Decision:** Proxy all `/api` requests to `http://localhost:3000` via Vite configuration.
- **Rationale:** Minimizes hardcoded base URLs in fetch calls and eases routing.

---

## Finalized Specifications
- **SPA Location:** `/client/`
- **Framework:** React 19 / TypeScript / Vite 6
- **Layout:** Responsive Flexbox grid (Control Dashboard on Left, Live LinkedIn preview card and Editor textarea on Right).
- **Core Elements:** Topic dropdown (synced with GET `/api/topics`), custom topic field, optional context field, dry-run toggle button, character counter with status bar indicator (0 to 3000 limit), live publish button.
