# Feature Research

**Domain:** Social Media Automation Dashboard (Web Triggered Agent)
**Researched:** 2026-06-17
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Topic Selector | Users need to choose from predefined genres/topics. | LOW | Load lists of available genres and default topics from server. |
| Custom Topic Input | Users want to write custom, ad-hoc topics. | LOW | Text input field on the dashboard. |
| Optional Context Box | Custom runs need parameters like guidelines, references, or links. | LOW | Textarea on the dashboard. |
| Draft Preview Card | Displays the drafted post text from the agent before sending. | LOW | Styled container mimicking a LinkedIn post. |
| Live Draft Editor | Users MUST be able to edit the generated draft before publishing. | MEDIUM | Standard HTML textarea or rich-text field. |
| Publish Button | Direct publishing trigger that completes the paused agent loop. | MEDIUM | Calls Express backend endpoint to resume the LangGraph execution. |
| Dry Run Option | Ability to run the whole flow (generation + HITL approval) without writing to the live API. | LOW | Checkbox in UI that toggles `DRY_RUN` flag. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Character Counter | Alerts users if post exceeds LinkedIn's 3000-character limit during editing. | LOW | Client-side reactive length check. |
| Tech-Style Formatting (Few-Shot) | High-fidelity technical style (paragraph breaks, limited emojis, precise tech anchors). | MEDIUM | Custom few-shot prompts added to `prompts.ts`. |
| Premium Visual Aesthetics | Wow-factor dark mode, glassmorphism, micro-animations, and clean fonts. | MEDIUM | Tailored Vanilla CSS design system. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| React Native Mobile App | Portable trigger | High setup complexity, compiler dependencies, app store publishing, and local credential safety issues. | Responsive mobile web app running in browser. |
| User Auth (Sign up / Login) | Secure multi-user access | Creates database and session overhead for a single-user personal agent. | Static security header or simple token environment guard. |
| Image Generation | Visually busy posts | Tech audiences on LinkedIn strongly prefer clean text posts; AI images often look spammy. | Focus on high-quality technical plain-text. |

## Feature Dependencies

```
[Web Dashboard UI]
     └──requires──> [Express API Server]
                        └──requires──> [LangGraph Agent Execution]
                                           └──requires──> [Gemini & LinkedIn APIs]
```

### Dependency Notes

- **Web Dashboard UI requires Express API Server:** The frontend React client communicates with the agent exclusively through Express endpoints.
- **Express API Server requires LangGraph Agent Execution:** The Express endpoints load and run/resume compiled LangGraph execution states.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Express API Setup** — Expose endpoints for `/api/topics`, `/api/draft`, and `/api/publish`.
- [ ] **React Dashboard UI** — Select pre-defined topics or type custom topics and optional contexts.
- [ ] **Interactive Draft Preview** — View the draft in a visual text editor.
- [ ] **Interactive Draft Editing** — Modify post copy before sending.
- [ ] **LinkedIn Direct Publish** — Triggers the final API call.
- [ ] **Character Counter** — Real-time length warning in the editor.
- [ ] **Few-shot Prompting** — Refined prompt to match actual high-quality LinkedIn styles.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Slack or Telegram Notification Webhooks** — Pushes drafts to messaging apps if visual triggers are skipped.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multi-account Posting** — Support posting to multiple LinkedIn profiles.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Express REST API | HIGH | MEDIUM | P1 |
| Web Dashboard (Vite/React) | HIGH | MEDIUM | P1 |
| Interactive Text Editor | HIGH | LOW | P1 |
| Character Counter | MEDIUM | LOW | P1 |
| Few-shot Prompting | HIGH | LOW | P1 |
| Dry Run Option | MEDIUM | LOW | P1 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Sources

- LinkedIn UGC API constraints.
- Existing codebase architecture (`src/`).

---
*Feature research for: Social Media Automation Dashboard*
*Researched: 2026-06-17*
