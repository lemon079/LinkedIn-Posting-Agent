---
phase: 04-multi-user-production-integration
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified: [
  "package.json",
  "client/package.json",
  "src/config/schema.sql",
  "src/services/crypto.ts",
  "src/services/supabase.ts",
  "src/middleware/auth.ts",
  "src/controllers/auth.ts",
  "src/routes/auth.ts",
  "src/server.ts",
  "src/controllers/posts.ts",
  "src/controllers/publish.ts",
  "client/src/lib/supabase.ts",
  "client/src/components/AuthForm.tsx",
  "client/src/components/SettingsPanel.tsx"
]
autonomous: false
requirements: ["SEC-01", "AUTH-01", "AUTH-02"]
must_haves:
  truths:
    - "Server starts cleanly with Supabase integrations"
    - "Client build completes with auth UI"
  artifacts:
    - path: "src/middleware/auth.ts"
      provides: "JWT Authentication middleware"
      contains: "supabase"
    - path: "src/controllers/auth.ts"
      provides: "LinkedIn OAuth endpoint callback handler"
      contains: "accessToken"
---

<objective>
Implement Supabase authentication, secure DB storage with AES-256-GCM encryption, and LinkedIn OAuth 2.0 redirection flow to transition the application to a secure multi-user deployment.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/phases/04-multi-user-production-integration/04-CONTEXT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Supabase and Cryptographic dependencies</name>
  <files>package.json, client/package.json</files>
  <read_first>package.json, client/package.json</read_first>
  <action>Install `@supabase/supabase-js` in both backend and client workspaces. Run `npm install @supabase/supabase-js` at root level, and run `npm install @supabase/supabase-js` in `client/` folder.</action>
  <verify>Dependencies appear in package.json files</verify>
  <acceptance_criteria>
    - root package.json contains @supabase/supabase-js
    - client/package.json contains @supabase/supabase-js
  </acceptance_criteria>
  <done>Supabase dependency packages installed</done>
</task>

<task type="auto">
  <name>Task 2: Define database schema SQL</name>
  <files>src/config/schema.sql</files>
  <action>Create a new schema file `src/config/schema.sql`. Write DDL definitions for the `user_settings` table linked to Supabase auth users schema, including columns for LLM preferences, encrypted credentials, and LinkedIn profiles. Enable Row Level Security (RLS) policies allowing users to select and update only their own rows: `create policy "Users can modify their own settings" on user_settings for all using (auth.uid() = user_id)`. </action>
  <verify>schema.sql is created containing public.user_settings table</verify>
  <acceptance_criteria>
    - src/config/schema.sql contains table public.user_settings definition
    - RLS policy uses auth.uid()
  </acceptance_criteria>
  <done>SQL schema schema.sql created</done>
</task>

<task type="auto">
  <name>Task 3: Create backend Cryptography Service</name>
  <files>src/services/crypto.ts</files>
  <action>Create a new utility module `src/services/crypto.ts`. Implement `encrypt(text)` and `decrypt(cipher)` functions using Node's native `crypto` module (AES-256-GCM cipher). Use an encryption key loaded from `process.env.ENCRYPTION_KEY`. Ensure both initialization vector (IV) and authentication tag are prepended or handled securely in output string format.</action>
  <verify>crypto.ts compiles cleanly without errors</verify>
  <acceptance_criteria>
    - src/services/crypto.ts exports encrypt and decrypt functions
    - Uses aes-256-gcm algorithm
  </acceptance_criteria>
  <done>Cryptography encryption/decryption module implemented</done>
</task>

<task type="auto">
  <name>Task 4: Implement Supabase admin service and Auth Middleware</name>
  <files>src/services/supabase.ts, src/middleware/auth.ts</files>
  <read_first>src/services/supabase.ts, src/middleware/auth.ts</read_first>
  <action>Create `src/services/supabase.ts` to initialize the Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Create `src/middleware/auth.ts` containing Express middleware. Extract JWT token from the `Authorization: Bearer <token>` header, validate it via `supabase.auth.getUser()`, and attach the user object (`req.user = user`) to the request context. Return 401 Unauthorized if invalid or missing.</action>
  <verify>Auth middleware compiles and validates correctly</verify>
  <acceptance_criteria>
    - src/services/supabase.ts exports supabase admin client
    - src/middleware/auth.ts checks Authorization header and populates req.user
  </acceptance_criteria>
  <done>Auth middleware and Supabase server client configured</done>
</task>

<task type="auto">
  <name>Task 5: Implement LinkedIn OAuth routes and controllers</name>
  <files>src/controllers/auth.ts, src/routes/auth.ts, src/server.ts</files>
  <read_first>src/server.ts</read_first>
  <action>Create `src/controllers/auth.ts` implementing two endpoints: (1) `/api/auth/linkedin` redirects users to LinkedIn authorization endpoint with required scopes (w_member_social, openid, profile); (2) `/api/auth/linkedin/callback` receives code, requests access token from LinkedIn, fetches user profile to get URN, encrypts the credentials, and saves them to the DB under the authenticated user's ID. Mount these routes under `src/routes/auth.ts` and attach to Express app in `src/server.ts` alongside authentication checks.</action>
  <verify>Endpoints compile and map to server routes</verify>
  <acceptance_criteria>
    - src/controllers/auth.ts implements oauth login and callback token exchange
    - routes are mounted on Express application
  </acceptance_criteria>
  <done>LinkedIn OAuth flow routes and controllers implemented</done>
</task>

<task type="auto">
  <name>Task 6: Update backend controllers to load preferences from DB</name>
  <files>src/controllers/posts.ts, src/controllers/publish.ts</files>
  <read_first>src/controllers/posts.ts, src/controllers/publish.ts</read_first>
  <action>Modify `src/controllers/posts.ts` and `src/controllers/publish.ts` to intercept authenticated requests. If `req.user` is present, fetch and decrypt the user's settings (API keys, LinkedIn tokens, model preferences) from Supabase PostgreSQL before starting LangGraph execution or publish tasks, rather than reading them from custom headers.</action>
  <verify>Controllers compile successfully</verify>
  <acceptance_criteria>
    - controllers read and decrypt settings from database when user is authenticated
  </acceptance_criteria>
  <done>Backend controllers updated to load settings from DB</done>
</task>

<task type="auto">
  <name>Task 7: Setup client Supabase context and AuthForm UI component</name>
  <files>client/src/lib/supabase.ts, client/src/components/AuthForm.tsx</files>
  <action>Create `client/src/lib/supabase.ts` initializing Supabase client via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Create `client/src/components/AuthForm.tsx` providing email-and-password Signup, Login, and Logout forms using Tailwind CSS styling and Supabase SDK login functions.</action>
  <verify>Client compiles and AuthForm renders correctly</verify>
  <acceptance_criteria>
    - client/src/lib/supabase.ts exports supabase client
    - AuthForm displays Login and Signup inputs
  </acceptance_criteria>
  <done>Frontend Supabase auth wrapper and AuthForm layout implemented</done>
</task>

<task type="auto">
  <name>Task 8: Integrate OAuth and Auth State in SettingsPanel</name>
  <files>client/src/components/SettingsPanel.tsx</files>
  <read_first>client/src/components/SettingsPanel.tsx</read_first>
  <action>Modify `client/src/components/SettingsPanel.tsx`. If the user is unauthenticated, render the `AuthForm` widget. If authenticated, show their profile email, custom settings forms (fetching and updating database settings), and a prominent "Connect LinkedIn Account" button pointing to the server-side OAuth redirect endpoint `/api/auth/linkedin`.</action>
  <verify>SettingsPanel compilation succeeds</verify>
  <acceptance_criteria>
    - SettingsPanel displays AuthForm when not logged in
    - Authenticated state renders profile info and LinkedIn connect triggers
  </acceptance_criteria>
  <done>Frontend settings UI integrated with auth and OAuth flows</done>
</task>

</tasks>

<verification>
- [ ] Backend and client build passes: `npm run check`
- [ ] User login and settings synchronization operate without exceptions
</verification>

<success_criteria>
- Supabase auth middleware verifies client Bearer tokens on Express
- DB profile mapping retrieves user keys and encrypts them at rest via AES-256-GCM
- Redirection flows complete LinkedIn OAuth exchanges and fetch URN metadata
- UI exposes Login, Signup, and Connect LinkedIn triggers with proper state bindings
</success_criteria>

<output>
Create `.planning/phases/04-multi-user-production-integration/04-SUMMARY.md` on completion.
</output>
