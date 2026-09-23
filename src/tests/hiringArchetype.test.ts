import { ARCHETYPE_OPTIONS, HookOptionSchema } from "@/modules/agent/core/schemas";
import { analyzeIntake } from "@/modules/agent/nodes/analyzeIntake";
import { HIRING_EXEMPLARS } from "@/modules/agent/core/domains";
import { getSystemPrompt, getCritiquePrompt } from "@/modules/agent/core/prompts";
import { DOMAINS } from "@/modules/agent/core/domains";
import type { State } from "@/modules/agent/core/state";

describe("Task A: Hiring Archetype + Auto-Select Fabrication Fix", () => {
  describe("Archetype Options & Schemas", () => {
    test("ARCHETYPE_OPTIONS includes 'hiring'", () => {
      expect(ARCHETYPE_OPTIONS).toContain("hiring");
      expect(ARCHETYPE_OPTIONS).toEqual([
        "auto",
        "teardown",
        "contrarian",
        "framework",
        "breakdown",
        "comparison",
        "hiring",
      ]);
    });

    test("HookOptionSchema validates 'hiring' type", () => {
      const validHook = {
        type: "hiring",
        hook: "We're expanding our infrastructure team to solve our Kafka partition lag:",
        rationale: "Mission-driven technical challenge opener",
      };
      const result = HookOptionSchema.safeParse(validHook);
      expect(result.success).toBe(true);
    });

    test("HIRING_EXEMPLARS provides authentic reference posts", () => {
      expect(HIRING_EXEMPLARS.length).toBeGreaterThanOrEqual(2);
      for (const exemplar of HIRING_EXEMPLARS) {
        expect(exemplar).toContain("#hiring");
        expect(exemplar.length).toBeGreaterThan(100);
      }
    });
  });

  describe("Auto-Select Anti-Fabrication Routing", () => {
    test("definitional question 'who is a forward deployed engineer?' does NOT route to Incident Teardown", async () => {
      const state: Partial<State> = {
        topic: "who is a forward deployed engineer?",
        context: "explaining the role, daily work, and expectations",
        archetype: "auto",
        domain: "engineering",
      };

      // When intake analysis runs (even if LLM structured output falls back or attempts teardown):
      const result = await analyzeIntake(state as State);
      expect(result.activeArchetype).not.toBe("teardown");
      expect(result.activeArchetype).toBe("breakdown");
    });

    test("hiring topic with 'auto' archetype routes to 'hiring'", async () => {
      const state: Partial<State> = {
        topic: "We are hiring a Senior Distributed Systems Engineer",
        context: "Remote US, Kafka, ClickHouse, 4+ years experience",
        archetype: "auto",
        domain: "engineering",
      };

      const result = await analyzeIntake(state as State);
      expect(result.activeArchetype).toBe("hiring");
    });

    test("explicit user archetype preference overrides auto-select", async () => {
      const state: Partial<State> = {
        topic: "who is a forward deployed engineer?",
        context: "comparing FDE vs Solutions Architect",
        archetype: "comparison",
        domain: "engineering",
      };

      const result = await analyzeIntake(state as State);
      expect(result.activeArchetype).toBe("comparison");
    });
  });

  describe("Hiring Prompts & Critic Rubric", () => {
    test("system prompt includes Hiring archetype structure with anti-fabrication mandate", () => {
      const prompt = getSystemPrompt(DOMAINS.engineering);
      expect(prompt).toContain("The Hiring / Recruiting Post");
      expect(prompt).toContain("NEVER fabricate compensation");
      expect(prompt).toContain("Clear CTA");
    });

    test("critique prompt includes Hiring evaluation criteria", () => {
      const prompt = getCritiquePrompt(DOMAINS.engineering, "Draft text");
      expect(prompt).toContain("HIRING / RECRUITING POST EVALUATION CRITERIA");
      expect(prompt).toContain("Role clarity & concrete day-to-day");
      expect(prompt).toContain("Clear Frictionless CTA");
      expect(prompt).toContain("Anti-fabrication check");
    });
  });
});
