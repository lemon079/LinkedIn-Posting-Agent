# Plan: Resolve Tavily Key Error and Prompt Login on Post

Ensure that the missing Tavily API key does not crash/error out during post drafting, and implement a login prompt modal that triggers only when an unauthenticated user attempts to publish a post.

## Proposed Changes

### Configuration and API Headers

#### [MODIFY] [api.ts](file:///d:/Work/linkedin-agent/src/lib/api.ts)
- Add `x-tavily-key` header mapping in `getHeaders`.

#### [MODIFY] [state.ts](file:///d:/Work/linkedin-agent/src/core/state.ts)
- Add `tavilyApiKey` annotation property to `AgentState`.

### Backend Route and Graph Generation

#### [MODIFY] [route.ts](file:///d:/Work/linkedin-agent/src/app/api/draft/route.ts)
- Extract the `x-tavily-key` header.
- Retrieve `encrypted_tavily_key` from Supabase user settings when available.
- Populate `tavilyApiKey` inside `initialState`.

#### [MODIFY] [generatePost.ts](file:///d:/Work/linkedin-agent/src/graph/nodes/generatePost.ts)
- Retrieve the Tavily key from `state.tavilyApiKey` or `process.env.TAVILY_API_KEY`.
- If the Tavily key is not set, bypass tool calling and invoke the LLM directly instead of returning an error.

### UI Interaction

#### [MODIFY] [page.tsx](file:///d:/Work/linkedin-agent/src/app/page.tsx)
- Implement `showLoginPrompt` state.
- Create an `onPublish` handler wrapper that shows a modal with `AuthForm` if the user is not authenticated (`!user`).
- Render a modern login modal overlay when `showLoginPrompt` is true.

---

## Verification Plan

### Automated Checks
- Run `npm run build` to confirm compilation.
- Run `npm run lint` to verify code quality.
- Run `npm run test` to ensure unit tests continue passing.

### Manual Verification
- Test generating a post when the Tavily API key is not configured and verify it drafts successfully.
- Test clicking the "Approve & Publish Post" button when not logged in and confirm the login modal displays.
