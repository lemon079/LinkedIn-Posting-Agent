# Project Roadmap & Action Items

## 1. Merge and verify the simplification refactor

- [x] Get the removal prompt from before merged, then actually run the four "verify after" checks against staging — no cross-provider handoff, no silent model downgrade, critic on the same model as generation, consistent analyzeIntake output across repeated runs. (Completed: verified 4/4 checks passing live on Ollama gpt-oss:20b-cloud).

## 2. Simplify post creation UI panel for users

- [x] Removed web search toggle from the UI composer; grounding is now handled autonomously by the `researchGrounding` graph node based on archetype eligibility.
- [ ] Streamline remaining controls, reduce visual clutter, and make post generation more intuitive and accessible.

## 3. Build a labeled eval set

- [x] 50-100 real generated posts across your different domain configs, human-scored per critique axis (hook, authenticity, domain grounding, structure) plus the fabrication and contrarian-bait flags. (Eval harness built in `scripts/run-evals.ts` with 62 cases in `eval-dataset.json`, automated metrics, checkpoint/resume, and CSV export for human scoring via `npm run eval:run`).
- [x] Human scoring pass completed: 68% of drafts rejected (primarily fabrication), 19% need refinement, 8% pass. Full analysis in `eval-results/human-scoring-analysis.md`.

## 4. Harden `generateDraft` prompt against fabrication

- [x] Added STRICT ANTI-FABRICATION MANDATE to system prompt, refine prompt, and conversational refine prompt.
- [x] Tightened critic scoring: fabrication-flagged posts now capped at score ≤3 (was ≤4), separating fabrication from contrarian-bait enforcement.
- [x] Added no-grounding-data reminder in generateDraft user message.
- [ ] Re-run eval (`npm run eval:run`) to measure fabrication reduction and confirm pass rate improves.

## 5. Validate the critique prompt against human labels

- [ ] Run the critic on each labeled example, compare its verdict to the human label per axis, and compute agreement. Fix the rubric/prompt where it disagrees systematically before trusting the score<=2 gate in production — this is the step that's been missing since the first version of this critic.

## 6. Improve contrarian-bait detection (20% recall)

- [ ] The critic only catches 1/5 contrarian-bait cases. Strengthen the contrarianBaitFlag prompt with examples of subtle contrarian framing with invented supporting evidence.

## 7. Fix trace tagging in LangSmith

- [ ] Tag every run with provider, model, and node name at minimum. This is what makes every later decision in this list something you can actually check against evidence — without it you're back to guessing whether a change helped.

## 8. Validate the same eval set on a second and third provider

- [ ] Before letting BYOK users pick OpenAI or Anthropic, run your labeled set against each. Confirms the rubric generalizes rather than only working on whichever provider you built and tuned it against.

## 9. Close the loop from production

- [ ] Pipe thumbs-down feedback and any needs_human_review escalations back into the eval set as new test cases. This keeps the dataset growing from real failures instead of staying frozen at whatever you built in step 2.

## 10. Reintroduce complexity one piece at a time, gated on evidence

- [ ] In order: critic down-tiering (only if a cheaper model still agrees with human labels), same-tier fallback with retry (tagged in traces, never silent), reasoning-token budgets tuned via A/B against the eval set. Cross-provider fallback comes last, and only if it's surfaced to the user rather than hidden.

---

## Side TODO: AI Model Fallbacks

- [ ] **AI Model Fallback Architecture (Deferred)**: All silent AI model fallbacks (`.withFallbacks()`, intra-provider downgrades, and cross-provider handoffs) have been completely removed from the generation and validation pipeline. Every call now operates on exactly one predictable model with retries on that same model. If AI model fallbacks are ever reconsidered, implement them only under these constraints:
  - Explicit and user-visible (surface model transitions in telemetry, UI, and LangSmith traces, never silent).
  - Opt-in configuration per user/tenant rather than automatic silent substitution.
  - Gated by evals: fallback models must pass the labeled eval benchmark with comparable rubric agreement before deployment.
