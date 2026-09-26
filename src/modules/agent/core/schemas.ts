import { z } from "zod";

export const DOMAIN_OPTIONS = [
  "engineering",
  "hr",
  "sales",
  "marketing",
  "general",
] as const;

export const TONE_OPTIONS = [
  "conversational",
  "authoritative",
  "vulnerable",
  "provocative",
  "reflective",
] as const;

export const ARCHETYPE_OPTIONS = [
  "auto",
  "teardown",
  "contrarian",
  "framework",
  "breakdown",
  "comparison",
  "hiring",
] as const;

/**
 * Structured output schema for the Intake Analyst node.
 * Standard clean schema fully compatible with Gemini, OpenAI, Anthropic, and Ollama tool-calling.
 */
export const IntakeAnalysis = z.object({
  topic: z.string().default("").describe("The core topic or question for the post"),
  context: z.string().default("").describe("Additional context, background, or relevant details"),
  domain: z
    .enum(DOMAIN_OPTIONS)
    .default("general")
    .describe("The user's professional domain"),
  angle: z
    .string()
    .default("")
    .describe("A specific angle, hook direction, or narrative framing for the post"),
  archetype: z
    .enum(ARCHETYPE_OPTIONS)
    .default("auto")
    .describe("Recommended post archetype or structure"),
  tone: z
    .enum(TONE_OPTIONS)
    .default("conversational")
    .describe("Recommended tone for the post"),
});

export type Verdict = "pass" | "refine" | "needs_human_review";

// =====================================================================
// FIX: Gemini's function-calling schema (OpenAPI-3.0 subset) does not
// support "$ref". The shared AxisScore object from the previous fix,
// reused for hook/authenticity/domainGrounding/structure, gets
// deduplicated into a $ref by the schema converter — which Gemini's
// parameter parser rejects outright. Every critique call was failing
// structured output and silently falling back to score 7 (pass).
//
// Flattening removes any repeated object shape, so there's nothing left
// to turn into a $ref, regardless of which schema converter/version runs
// underneath .withStructuredOutput() for a given provider.
// =====================================================================

export const CritiqueResult = z.object({
  hookScore: z.number().int().min(1).max(4).describe("Score from 1 (poor) to 4 (exceptional) for the opening hook"),
  hookReason: z.string().describe("One sentence citing the specific line/phrase behind the hook score"),

  authenticityScore: z.number().int().min(1).max(4).describe("Score from 1 to 4 for authenticity / natural cadence"),
  authenticityReason: z.string().describe("One sentence citing the specific line/phrase behind authenticity"),

  domainGroundingScore: z.number().int().min(1).max(4).describe("Score from 1 to 4 for domain grounding"),
  domainGroundingReason: z.string().describe("One sentence citing the specific line/phrase behind domain grounding"),

  structureScore: z.number().int().min(1).max(4).describe("Score from 1 to 4 for formatting and structure"),
  structureReason: z.string().describe("One sentence citing the specific line/phrase behind structure"),

  fabricationFlag: z
    .boolean()
    .describe("true if the draft states a metric, outage, or benchmark not present in sourceContext"),
  contrarianBaitFlag: z
    .boolean()
    .describe("true if the post manufactures outrage without genuine technical substance"),

  instructions: z
    .string()
    .describe("Rewrite instructions targeting ONLY axes scoring <=2, or any true flag. No generic advice."),

  // Post-processed enriched fields
  score: z.number().default(7).describe("Computed quality score from 1 (poor) to 10 (excellent)"),
  strengths: z.array(z.string()).default([]).describe("What works well in the draft"),
  weaknesses: z.array(z.string()).default([]).describe("What needs improvement"),
  verdict: z.enum(["pass", "refine", "needs_human_review"]).default("pass").describe("Critique verdict: pass, refine, or needs_human_review"),
  reasons: z.array(z.string()).default([]).describe("Enumerable failure reasons for logging and UI escalation"),
});
export type CritiqueResult = z.infer<typeof CritiqueResult>;

export function decideCritique(
  det: { passed: boolean; failures: string[] },
  llm: CritiqueResult | null,
  refinementAttempt: number,
  maxAttempts = 2
): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [...det.failures];

  if (!det.passed) {
    return { verdict: refinementAttempt < maxAttempts ? "refine" : "needs_human_review", reasons };
  }

  if (!llm) {
    return { verdict: "pass", reasons: [] };
  }

  if (llm.fabricationFlag) reasons.push("Unverified claim not present in source context.");
  if (llm.contrarianBaitFlag) reasons.push("Outrage-bait without substance.");

  const axes = [
    { name: "hook", score: llm.hookScore, reason: llm.hookReason },
    { name: "authenticity", score: llm.authenticityScore, reason: llm.authenticityReason },
    { name: "domainGrounding", score: llm.domainGroundingScore, reason: llm.domainGroundingReason },
    { name: "structure", score: llm.structureScore, reason: llm.structureReason },
  ];
  const failingAxes = axes.filter((a) => typeof a.score === "number" && a.score <= 2);
  reasons.push(...failingAxes.map((a) => a.reason || `${a.name} scored <= 2`));

  const hasBlockingIssue = Boolean(llm.fabricationFlag) || Boolean(llm.contrarianBaitFlag) || failingAxes.length > 0;
  if (!hasBlockingIssue) return { verdict: "pass", reasons: [] };

  if (refinementAttempt >= maxAttempts) {
    return { verdict: "needs_human_review", reasons };
  }
  return { verdict: "refine", reasons };
}

// Legacy type alias for AxisScore compatibility if referenced elsewhere
export const AxisScore = z.object({
  score: z.number().int().min(1).max(4).default(3),
  reason: z.string().default(""),
});

export interface IntakeResult {
  domain: string;
  archetype: string;
  tone: string;
  usedFallback: boolean;
}

export function resolveIntakeOnLLMFailure(
  userDomain: string,
  userArchetype: string,
  userTone: string
): IntakeResult | { needsUserInput: true; usedFallback: true } {
  const allExplicit = userDomain !== "auto" && userArchetype !== "auto" && userTone !== "auto";
  if (allExplicit) {
    return { domain: userDomain, archetype: userArchetype, tone: userTone, usedFallback: false };
  }
  // Nothing reliable to fall back to — ask, don't guess.
  return { needsUserInput: true, usedFallback: true };
}

export const HookOptionSchema = z.object({
  type: z
    .enum(["metric", "contrarian", "incident", "curiosity", "question", "hiring"])
    .describe("The archetype or psychological angle of the hook"),
  hook: z
    .string()
    .describe("The opening 1-2 lines (under 25 words) before the first paragraph break"),
  rationale: z
    .string()
    .describe("Short 1-sentence explanation of why this hook drives feed click-through"),
});

export const AlternativeHooksResult = z.object({
  hooks: z.array(HookOptionSchema).describe("List of high-impact alternative hooks"),
});

export type IntakeAnalysis = z.infer<typeof IntakeAnalysis>;
export type AxisScore = z.infer<typeof AxisScore>;
export type HookOption = z.infer<typeof HookOptionSchema>;
export type AlternativeHooksResult = z.infer<typeof AlternativeHooksResult>;

