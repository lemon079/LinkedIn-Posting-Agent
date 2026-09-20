import { classifyIntent } from "@/modules/agent/core/intent";

describe("Phase 5: Intent Classification & Anti-Fabrication Guardrail", () => {
  describe("Refinement Intent ('refine')", () => {
    it("should classify stylistic and structural follow-ups as 'refine'", () => {
      const examples = [
        "make it punchier",
        "make it shorter",
        "add more emphasis on the outcome",
        "less formal and more conversational",
        "tighten the body and improve the takeaway",
        "rephrase the call to action",
        "change the opening hook to be more urgent",
      ];

      for (const msg of examples) {
        const result = classifyIntent(msg, "Existing draft about microservices.");
        expect(result.intent).toBe("refine");
        expect(result.changeNote).toBeDefined();
      }
    });

    it("should allow metric refinements when the user explicitly provides figures", () => {
      const result = classifyIntent(
        "add our 45% latency reduction and 12ms p99 SLA metric",
        "Existing draft about Kafka."
      );
      expect(result.intent).toBe("refine");
      expect(result.changeNote).toBe("Incorporate metrics and data");
    });
  });

  describe("Anti-Fabrication Guardrail ('missing_metric')", () => {
    it("should block hallucinating numbers when the user requests metrics without providing figures", () => {
      const ungroundedRequests = [
        "add metrics to make it sound credible",
        "include benchmark statistics and numbers",
        "can you add some metrics and data?",
        "put some percentages and growth stats in",
      ];

      for (const msg of ungroundedRequests) {
        const result = classifyIntent(msg, "Existing draft about database sharding.");
        expect(result.intent).toBe("missing_metric");
        expect(result.conversationalReply).toBeDefined();
        expect(result.conversationalReply?.toLowerCase()).toMatch(/share|provide|specific.*(metric|number|data|percentage)/i);
      }
    });
  });

  describe("New Post Intent ('new_post')", () => {
    it("should detect when user explicitly asks for a new post or topic reset", () => {
      const newPostRequests = [
        "write a new post about Kubernetes clusters",
        "let's start over from scratch",
        "scrap this and write something else",
        "create a brand new post regarding AI agents",
        "start fresh with a different topic",
      ];

      for (const msg of newPostRequests) {
        const result = classifyIntent(msg, "Existing draft about Kafka.");
        expect(result.intent).toBe("new_post");
      }
    });

    it("should default to 'new_post' if there is no current draft", () => {
      const result = classifyIntent("make it punchier", null);
      expect(result.intent).toBe("new_post");
    });
  });

  describe("Question Intent ('question')", () => {
    it("should classify inquiries about LinkedIn strategies or agent capabilities as 'question'", () => {
      const questions = [
        "what archetypes work best for technical leaders?",
        "how does the critic evaluate post scores?",
        "why did you choose this angle?",
        "what is the character limit on LinkedIn?",
      ];

      for (const msg of questions) {
        const result = classifyIntent(msg, "Existing draft about architecture.");
        expect(result.intent).toBe("question");
        expect(result.conversationalReply).toBeDefined();
        expect(result.conversationalReply?.length).toBeGreaterThan(10);
      }
    });
  });
});
