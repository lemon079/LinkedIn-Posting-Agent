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

export type IntakeAnalysisType = z.infer<typeof IntakeAnalysis>;
export type CritiqueResultType = z.infer<typeof CritiqueResult>;
