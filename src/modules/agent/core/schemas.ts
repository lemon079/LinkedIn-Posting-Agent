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

/**
 * Structured output schema for the Critic node.
 * Clean non-union schema fully compatible with Google Gemini function calling and all LLM providers.
 */
export const CritiqueResult = z.object({
  score: z
    .number()
    .min(1)
    .max(10)
    .default(7)
    .describe("Quality score from 1 (poor) to 10 (excellent)"),
  strengths: z
    .array(z.string())
    .default([])
    .describe("What works well in the draft"),
  weaknesses: z
    .array(z.string())
    .default([])
    .describe("What needs improvement"),
  instructions: z
    .string()
    .default("")
    .describe("Specific rewrite instructions for the refinement step"),
});

export const HookOptionSchema = z.object({
  type: z
    .enum(["metric", "contrarian", "incident", "curiosity", "question"])
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
export type CritiqueResult = z.infer<typeof CritiqueResult>;
export type HookOption = z.infer<typeof HookOptionSchema>;
export type AlternativeHooksResult = z.infer<typeof AlternativeHooksResult>;

