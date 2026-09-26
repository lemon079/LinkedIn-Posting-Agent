# Project Roadmap & Action Items

## 1. Merge and verify the simplification refactor
- [x] Get the removal prompt from before merged, then actually run the four "verify after" checks against staging — no cross-provider handoff, no silent model downgrade, critic on the same model as generation, consistent analyzeIntake output across repeated runs. (Completed: verified 4/4 checks passing live on Ollama gpt-oss:20b-cloud).

## 2. Simplify post creation UI panel for users
- [ ] Simplify post creation UI panel for users: Streamline controls, reduce visual clutter, and make post generation more intuitive and accessible.

## 3. Build a labeled eval set
- [ ] 50-100 real generated posts across your different domain configs, human-scored per critique axis (hook, authenticity, domain grounding, structure) plus the fabrication and contrarian-bait flags. Do this against Ollama locally — it's free, unlimited, and doesn't touch your Gemini quota or anyone's BYOK budget.

## 4. Validate the critique prompt against those labels
- [ ] Run the critic on each labeled example, compare its verdict to the human label per axis, and compute agreement. Fix the rubric/prompt where it disagrees systematically before trusting the score<=2 gate in production — this is the step that's been missing since the first version of this critic.

## 5. Fix trace tagging in LangSmith
- [ ] Tag every run with provider, model, and node name at minimum. This is what makes every later decision in this list something you can actually check against evidence — without it you're back to guessing whether a change helped.

## 6. Validate the same eval set on a second and third provider
- [ ] Before letting BYOK users pick OpenAI or Anthropic, run your labeled set against each. Confirms the rubric generalizes rather than only working on whichever provider you built and tuned it against.

## 7. Close the loop from production
- [ ] Pipe thumbs-down feedback and any needs_human_review escalations back into the eval set as new test cases. This keeps the dataset growing from real failures instead of staying frozen at whatever you built in step 2.

## 8. Reintroduce complexity one piece at a time, gated on evidence
- [ ] In order: critic down-tiering (only if a cheaper model still agrees with human labels), same-tier fallback with retry (tagged in traces, never silent), reasoning-token budgets tuned via A/B against the eval set. Cross-provider fallback comes last, and only if it's surfaced to the user rather than hidden.

---

## Side TODO: AI Model Fallbacks
- [ ] **AI Model Fallback Architecture (Deferred)**: All silent AI model fallbacks (`.withFallbacks()`, intra-provider downgrades, and cross-provider handoffs) have been completely removed from the generation and validation pipeline. Every call now operates on exactly one predictable model with retries on that same model. If AI model fallbacks are ever reconsidered, implement them only under these constraints:
  - Explicit and user-visible (surface model transitions in telemetry, UI, and LangSmith traces, never silent).
  - Opt-in configuration per user/tenant rather than automatic silent substitution.
  - Gated by evals: fallback models must pass the labeled eval benchmark with comparable rubric agreement before deployment.
