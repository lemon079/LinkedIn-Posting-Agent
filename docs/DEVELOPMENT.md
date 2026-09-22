<!-- generated-by: gsd-doc-writer -->
# Development Guide

This guide describes development workflows, repository scripts, coding conventions, branch strategies, and pull request procedures for Praxis.

---

## Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/lemon079/LinkedIn-Posting-Agent.git
cd LinkedIn-Posting-Agent
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Ensure that at least one model provider (`GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or local Ollama) and your Supabase connection strings are provided.

Generate a local encryption secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Initialization
Run `src/config/schema.sql` in your Supabase SQL editor to create all required tables and storage buckets.

### 4. Launch Dev Server
```bash
npm run dev
```
The application will be live at `http://localhost:3000`.

---

## Build Commands

The following scripts are defined in `package.json`:

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server with hot-reloading on port 3000. |
| `npm run build` | Compiles and builds the production bundle with Next.js Turbopack compiler. |
| `npm run start` | Boots the compiled production Next.js server. |
| `npm run lint` | Runs ESLint 9 across all TypeScript and React files with Next.js Core Web Vitals rules. |
| `npm test` | Runs the full Jest test suite across unit, UI, and integration specs. |
| `npm run tests` | Alias for `npm test`. |
| `npx tsc --noEmit` | Validates TypeScript types across the entire workspace without generating build output. |

---

## Code Style & Tooling

Praxis enforces strict type-safety and formatting standards across client and server layers.

### 1. ESLint Configuration
Configured in `eslint.config.mjs` using the ESLint 9 flat configuration format:
- `eslint-config-next/core-web-vitals`: Best practices for React 19 and Next.js 16 App Router.
- `eslint-config-next/typescript`: Strict TypeScript linting.
- Ignored paths: `.next/**`, `out/**`, `build/**`, `scripts/**`, `next-env.d.ts`.

Run ESLint:
```bash
npm run lint
```

### 2. TypeScript Standards
Configured in `tsconfig.json`:
- `target: "ES2017"`
- `lib: ["dom", "dom.iterable", "esnext"]`
- `strict: true`
- Path alias: `@/*` resolves to `./src/*`

Validate type correctness:
```bash
npx tsc --noEmit
```

### 3. Styling & Component Design
- **TailwindCSS v4**: Configured via `@tailwindcss/postcss` and `postcss.config.mjs`.
- **Radix UI Primitives & shadcn**: Found under `src/components/ui/` with `class-variance-authority` (cva) and `tailwind-merge`.
- **Assistant-UI**: Native `@assistant-ui/react` primitives for thread rendering, composers, and `ErrorState`.

---

## Branch Conventions

Praxis adheres to structured branch naming patterns:

- `main`: Production-ready release branch. Deployed to production.
- `dev`: Active integration branch.
- `feature/<feature-name>`: New capabilities (e.g. `feature/hook-lab-overhaul`).
- `fix/<bug-description>`: Bug fixes and patches (e.g. `fix/ollama-critique-parsing`).
- `chore/<task>`: Maintenance, refactoring, or dependency updates.

### Commit Conventions
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat(agent): add support for decision matrix post archetype`
- `fix(ui): ensure mobile responsive layout on small screens`
- `test(versioning): add regression suite for hook swapper version stack`
- `docs: update system architecture and API documentation`

---

## Pull Request Process

When submitting a pull request to Praxis:

1. **Verify All Quality Gates Locally:**
   ```bash
   # 1. Typecheck
   npx tsc --noEmit

   # 2. Lint
   npm run lint

   # 3. Unit & UI Tests
   npm test
   ```
2. **Follow the Pull Request Template:**
   Every PR must include:
   - **Summary**: Concise summary of changes with a Before vs After explanation and motivation.
   - **Tests**: Explicit commands run and confirmation of test passes.
   - **Risk Areas**: Any potential breaking changes, database migrations, or security impacts.
   - **Deployment Notes**: Environment variables or Supabase schema changes required.
3. **No Phantom Claims:** Never claim automated tests passed without running them locally or in CI.
4. **Clean Git History:** Rebase against `main` or `dev` to maintain a clean linear commit history without merge commits.
