# Pitfalls Research

**Domain:** Social Media Automation Dashboard (Web Triggered Agent)
**Researched:** 2026-06-17
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Publishing Unedited Draft Content

**What goes wrong:**
The user makes edits to the generated draft text in the Web Dashboard editor, but when clicking "Publish", the original unedited agent draft is posted to LinkedIn instead.

**Why it happens:**
The LangGraph agent pauses at the `publishPost` node breakpoint. The state contains the original generated text in `postContent`. When the scheduler resumes the graph (`agent.invoke(null, threadConfig)`), it continues with the state values stored inside the checkpointer. If the server does not update the checkpointer state with the client's edited text, the edits are ignored.

**How to avoid:**
The backend `POST /api/publish` controller must update the agent's thread state before resuming:
```typescript
await agent.updateState(threadConfig, { postContent: clientEditedText });
await agent.invoke(null, threadConfig);
```

**Warning signs:**
Edits done in the UI textarea are not reflected in the dry-run console logs or the final LinkedIn post.

**Phase to address:**
Phase 1 (Backend API integration).

---

### Pitfall 2: CORS Blockage in Local Development

**What goes wrong:**
The browser blocks requests from the Vite web interface to the Express API backend, causing empty lists, failed drafts, or networking exceptions in console log.

**Why it happens:**
Vite runs on port 5173, and Express runs on port 3000 by default. Browsers enforce Same-Origin Policy, rejecting fetch calls unless Cross-Origin Resource Sharing (CORS) is permitted.

**How to avoid:**
1. Install `cors` package in Express backend and configure it to whitelist the dev port.
2. In production, serve the compiled SPA static files directly from Express, avoiding cross-origin requests.

**Warning signs:**
Console errors stating `Access to fetch at 'http://localhost:3000/...' from origin 'http://localhost:5173' has been blocked by CORS policy`.

**Phase to address:**
Phase 2 (Frontend Client development).

---

### Pitfall 3: Expired LinkedIn Access Tokens

**What goes wrong:**
The publishing step fails with unhelpful error messages or hangs when posting to LinkedIn.

**Why it happens:**
LinkedIn Member Access Tokens expire every 60 days. When expired, API calls return `401 Unauthorized`.

**How to avoid:**
Catch errors in the LinkedIn publish service (`linkedin.ts`). Parse the response code, write a clear message to `state.error` (e.g. `LinkedIn access token expired. Regenerate token.`), and display it as an alert card in the UI.

**Warning signs:**
API errors displaying `401 Unauthorized` or UGC post failure codes.

**Phase to address:**
Phase 1 (Backend API integration).

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| In-Memory State (`MemorySaver`) | Quick setup, no DB configuration needed. | States are lost on server restart. Interrupted drafts cannot be resumed. | Acceptable in MVP where posting is triggered in real-time, one-off. |
| Hardcoded topics list | No database configuration. | Modifying available topics requires code change/commit. | Acceptable for personal agent utility. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| LinkedIn ugcPosts | Trying to post HTML, markdown headers, or raw double-stars. | Convert Markdown elements to raw plain text before transmitting. |
| Tavily API | Failing to pass Tavily key to the environment. | Fail fast at server boot if `TAVILY_API_KEY` is missing in config. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Missing character limit alarm | User drafts 3500 characters, clicks publish, and gets an API error. | Render a live character count in React and disable the "Publish" button if length > 3000. |
| Missing draft generation spinner | User clicks "Draft Post" and sees no response for 5-10 seconds while Gemini/Tavily runs. | Introduce a loading state spinner and disable buttons during API queries. |

## "Looks Done But Isn't" Checklist

- [ ] **State resumption:** Verifying that the text published on LinkedIn matches the edits, not the initial draft.
- [ ] **Mobile responsive checks:** Open the dashboard on a phone screen to confirm the editor textarea and buttons scale correctly.

---
*Pitfalls research for: Social Media Automation Dashboard*
*Researched: 2026-06-17*
