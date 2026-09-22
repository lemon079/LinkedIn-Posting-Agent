<!-- generated-by: gsd-doc-writer -->
# Getting Started with Praxis

Welcome to Praxis. This guide will walk you through setting up your local environment, initializing the database, and generating your first LinkedIn post with our autonomous multi-agent studio.

---

## Prerequisites

Before setting up Praxis, ensure you have the following installed:

- **Node.js**: `>= 20.0.0` (v22 LTS recommended as configured in `.github/workflows/ci.yml`).
- **npm**: `>= 10.0.0` (or `pnpm` / `yarn`).
- **Supabase Account & Project**: Required for state checkpointing, user settings, post history, and media storage.
- **LLM API Key**:
  - Google Gemini API Key (`GOOGLE_API_KEY`) for `gemini-3.7-flash` / `gemini-2.5-flash`, OR
  - OpenAI API Key (`OPENAI_API_KEY`), OR
  - Anthropic API Key (`ANTHROPIC_API_KEY`), OR
  - Local [Ollama](https://ollama.com/) instance running locally on `http://localhost:11434`.
- **LinkedIn Developer App (Optional for initial drafting)**: Required if you wish to publish directly to LinkedIn via OAuth 2.0.

---

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/lemon079/LinkedIn-Posting-Agent.git
cd LinkedIn-Posting-Agent
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Provision Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```

Generate a 32-byte cryptographic hex key for AES-256-GCM token encryption:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Open `.env` and fill in your values:
```env
# Primary LLM Key
GOOGLE_API_KEY="AIzaSy..."

# Supabase Credentials
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# AES-256-GCM Encryption Key
ENCRYPTION_KEY="your-generated-64-character-hex-key"

# LinkedIn OAuth App (Optional for drafting)
LINKEDIN_CLIENT_ID="your-client-id"
LINKEDIN_CLIENT_SECRET="your-client-secret"
LINKEDIN_REDIRECT_URI="http://localhost:3000/api/auth/linkedin/callback"
```

### 4. Initialize Database Schema
1. Navigate to the **SQL Editor** in your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open [`src/config/schema.sql`](file:///d:/Work/linkedin-agent/src/config/schema.sql) in this repository.
3. Paste the contents into the Supabase SQL Editor and run the script. This creates:
   - `user_settings`
   - `user_post_history`
   - `agent_checkpoints` & `agent_checkpoint_writes`
   - `temp-uploads` storage bucket with public read policies.

---

## First Run

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Open the Studio Workspace
Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Draft Your First Post
1. Choose an archetype from the quick-start chips (e.g. `Incident Teardown`, `Contrarian Take`, `Playbook`).
2. Type a topic or incident description in the prompt composer (e.g. *"How we dropped database connection timeouts by 80% using connection pooling"*).
3. Click **Generate Draft** or press `Enter`.
4. Observe the real-time execution steps (Intake Analysis → Draft Generation → Self-Critique & Refinement Loop → Safety Guardrails).
5. Review the generated post, audition alternate hooks in the **Hook Lab**, and inspect the live LinkedIn feed preview.

---

## Common Setup Issues

### 1. `CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_KEY environment variable is required in production`
- **Cause**: The application is starting with `NODE_ENV=production` without an `ENCRYPTION_KEY` configured.
- **Solution**: Generate a 32-byte (64-character) hex string using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and set it in `.env` or your hosting provider dashboard.

### 2. `Database error: relation "agent_checkpoints" does not exist`
- **Cause**: Supabase DDL schema was not executed prior to running the agent.
- **Solution**: Open `src/config/schema.sql` and execute all DDL statements in the Supabase SQL Editor.

### 3. `Failed to decrypt ciphertext with active encryption key`
- **Cause**: Changing the `ENCRYPTION_KEY` after saving encrypted credentials in `user_settings` will prevent decryption of previously encrypted keys.
- **Solution**: Keep your `ENCRYPTION_KEY` persistent, or clear the affected row in `user_settings` and re-enter your API keys in the Settings dialog.

### 4. Google Gemini Rate Limit / Quota Exceeded
- **Cause**: Free tier limits on Google AI Studio (`generate_content_free_tier_requests`).
- **Solution**: Praxis automatically activates the self-healing error handler node (`handleAgentError`). You can also configure secondary providers (OpenAI or local Ollama) in the Settings modal to ensure continuous operation.

---

## Next Steps

- Explore the complete [Architecture Overview](docs/ARCHITECTURE.md) to understand the LangGraph state machine.
- Read the [Development Guide](docs/DEVELOPMENT.md) for local workflows, branching, and code conventions.
- Check [Testing & Quality Assurance](docs/TESTING.md) to run the 17 unit and UI test suites.
- Review the [Configuration Reference](docs/CONFIGURATION.md) for full parameter documentation.
- See the [API Reference](docs/API.md) for endpoint details and SSE streaming contracts.
