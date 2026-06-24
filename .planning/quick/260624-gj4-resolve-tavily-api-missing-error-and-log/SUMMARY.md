# Quick Task Summary: Resolve Tavily Key Error and Prompt Login on Post

We resolved the deployed app crash caused by the missing Tavily API key and implemented a clean login prompt overlay that appears only when an unauthenticated user attempts to publish a post.

## Completed Tasks
- **Tavily Key Error Resolution**:
  - Added `tavilyApiKey` to the LangGraph state schema inside `src/core/state.ts`.
  - Updated the API helper `src/lib/api.ts` to forward `x-tavily-key` in headers.
  - Modified the draft API handler `src/app/api/draft/route.ts` to extract `x-tavily-key` header, decrypt it from user settings in PostgreSQL, and set it in `initialState.tavilyApiKey`.
  - Updated the graph generation node `src/graph/nodes/generatePost.ts` to check for `state.tavilyApiKey` or `process.env.TAVILY_API_KEY`. If no key is configured, it bypasses TavilySearch and tool calling, invoking the LLM directly to draft the post without throwing errors.
- **Login Timing refinement**:
  - Implemented `showLoginModal` state in `src/app/page.tsx`.
  - Added an `onPublishClick` handler wrapper to intercept the publish action when a user is not authenticated (`!user`), showing a sleek glassmorphism modal with the `AuthForm` instead.
  - Allowed settings to be configured locally without forcing login or sign-in overlays unless a post attempt is made.
- **Verification**:
  - Next.js production build (`npm run build`) succeeded with zero errors.
  - Linter (`npm run lint`) passed successfully.
  - All 12 unit tests (`npm run test`) passed successfully.
