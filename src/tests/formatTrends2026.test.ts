import { getSystemPrompt, getCritiquePrompt, getRefinePrompt, getConversationalRefinePrompt } from "@/modules/agent/core/prompts";
import { DOMAINS } from "@/modules/agent/core/domains";

describe("Task B: Format Trend Updates (2026 LinkedIn Norms)", () => {
  const domain = DOMAINS.engineering;

  describe("System Generation Prompt 2026 Norms", () => {
    const prompt = getSystemPrompt(domain);

    test("enforces 1,300 to 2,500 character sweet spot target range", () => {
      expect(prompt).toContain("1,300 to 2,500 characters");
    });

    test("strictly bans emoji-as-bullet-point patterns and limits emojis to 1-2", () => {
      expect(prompt).toContain("STRICT BAN ON EMOJI BULLETS");
      expect(prompt).toContain("Max 1-2 emojis across the ENTIRE post");
    });

    test("bans raw URLs in post body and directs links to first comment", () => {
      expect(prompt).toContain("NO RAW URLS IN POST BODY");
      expect(prompt).toContain("link in the first comment");
      expect(prompt).toContain("[FIRST_COMMENT]");
    });

    test("forbids generic 'Thoughts?' closers and mandates specific content question", () => {
      expect(prompt).toContain("Authentic Content Closer");
      expect(prompt).toContain("Never say \"Thoughts?\" or \"Agree?\"");
    });

    test("instructs generation of 3-5 niche hashtags in separate tag", () => {
      expect(prompt).toContain("3-5 niche, topic-specific hashtags inside [HASHTAGS]");
    });
  });

  describe("Critic Rubric 2026 Updates", () => {
    const critique = getCritiquePrompt(domain, "Test draft text");

    test("flags in-body links/URLs as hard fail (score <= 4)", () => {
      expect(critique).toContain("In-Body Links (HARD FAIL)");
      expect(critique).toContain("score <= 4");
    });

    test("flags mechanically repetitive structure and emoji bullets as AI pattern", () => {
      expect(critique).toContain("Mechanically Repetitive Structure (AI Pattern Check)");
      expect(critique).toContain("emoji-as-bullet patterns");
    });

    test("penalizes manufactured/bait-y contrarian framing under 2026 Authenticity rules", () => {
      expect(critique).toContain("Manufactured / Bait-y Contrarian Framing");
      expect(critique).toContain("2026 Authenticity Update");
    });

    test("treats character count outside 1,300-2,500 as soft warning rather than auto-fail", () => {
      expect(critique).toContain("Character Count Guidance (1,300 - 2,500 characters)");
      expect(critique).toContain("SOFT WARNING");
      expect(critique).toContain("do NOT auto-fail solely for length");
    });
  });

  describe("Refine Prompts 2026 Compliance", () => {
    test("getRefinePrompt enforces 2026 constraints", () => {
      const refine = getRefinePrompt(domain, "Draft", "Rewrite instructions");
      expect(refine).toContain("1,300-2,500 characters");
      expect(refine).toContain("NO Emoji Bullets");
      expect(refine).toContain("NO Raw URLs in Body");
      expect(refine).toContain("[HASHTAGS]");
    });

    test("getConversationalRefinePrompt enforces 2026 constraints", () => {
      const convRefine = getConversationalRefinePrompt({
        domainConfig: domain,
        draft: "Draft",
        userInstruction: "Make it punchier",
      });
      expect(convRefine).toContain("1,300 to 2,500 characters");
      expect(convRefine).toContain("NO emoji bullets");
      expect(convRefine).toContain("NO raw URLs in body");
      expect(convRefine).toContain("[HASHTAGS]");
    });
  });
});
