import { FakeListChatModel } from "@langchain/core/utils/testing";
import { runGuardrails } from "@/modules/agent/nodes/guardrail";
import type { State } from "@/modules/agent/core/state";
import * as llmService from "@/modules/agent/llm/factory";

export interface TrajectoryEvalResult {
  passed: boolean;
  actualSteps: string[];
  expectedSteps: string[];
  reason?: string;
}

export interface JudgeEvalResult {
  score: number; // 0.0 to 1.0
  passed: boolean;
  feedback: {
    hookLengthValid: boolean;
    buzzwordsFound: string[];
    hasHashtags: boolean;
    paragraphBreakValid: boolean;
  };
}

export interface EvalTestCase {
  id: string;
  topic: string;
  context: string;
  domain: string;
  expectedTrajectory: string[];
  prohibitedKeywords: string[];
}

const BANNED_BUZZWORDS = [
  "game-changer",
  "delve",
  "leverage",
  "paradigm shift",
  "synergy",
  "circle back",
  "deep dive",
  "unlock",
  "move the needle",
];

/**
 * Trajectory Evaluator
 * Assesses whether the agent executed the correct sequence of nodes in order.
 */
export function evaluateTrajectory(
  actualSteps: string[],
  expectedSequence: string[]
): TrajectoryEvalResult {
  let expectedIndex = 0;
  for (const step of actualSteps) {
    if (step === expectedSequence[expectedIndex]) {
      expectedIndex++;
    }
  }

  const passed = expectedIndex === expectedSequence.length;
  return {
    passed,
    actualSteps,
    expectedSteps: expectedSequence,
    reason: passed
      ? "Trajectory matched expected node sequence."
      : `Failed trajectory: missing expected node step '${expectedSequence[expectedIndex]}'.`,
  };
}

/**
 * LLM-as-a-judge Rule-Based Evaluator
 * Evaluates candidate draft for hook conciseness, formatting, and absence of corporate buzzwords.
 */
export function judgePostQuality(draft: string): JudgeEvalResult {
  const lines = draft.trim().split("\n").filter((l) => l.trim().length > 0);
  const firstLine = lines[0] || "";

  // 1. Hook evaluation
  const hookLengthValid = firstLine.length <= 100 && firstLine.length > 5;

  // 2. Buzzwords evaluation
  const lowerDraft = draft.toLowerCase();
  const buzzwordsFound = BANNED_BUZZWORDS.filter((bw) => lowerDraft.includes(bw));

  // 3. Hashtags evaluation (must end with hashtags)
  const hasHashtags = /#\w+/.test(draft);

  // 4. Paragraph break evaluation (short line blocks)
  const paragraphBreakValid = lines.length >= 2;

  let checksPassed = 0;
  if (hookLengthValid) checksPassed++;
  if (buzzwordsFound.length === 0) checksPassed++;
  if (hasHashtags) checksPassed++;
  if (paragraphBreakValid) checksPassed++;

  const score = checksPassed / 4;
  const passed = score >= 0.75;

  return {
    score,
    passed,
    feedback: {
      hookLengthValid,
      buzzwordsFound,
      hasHashtags,
      paragraphBreakValid,
    },
  };
}

describe("LangChain Agent Evals (Trajectory & Output Evaluation)", () => {
  const sampleEvalCases: EvalTestCase[] = [
    {
      id: "eval-01",
      topic: "Postgres Autovacuum Tuning",
      context: "Discuss dead tuples and scale factor",
      domain: "engineering",
      expectedTrajectory: ["generateDraft", "reviewAndRefine", "runGuardrails", "validatePost"],
      prohibitedKeywords: ["game-changer", "synergy"],
    },
    {
      id: "eval-02",
      topic: "React Suspense Network Waterfalls",
      context: "Nested vs parent route fetches",
      domain: "engineering",
      expectedTrajectory: ["generateDraft", "reviewAndRefine", "runGuardrails", "validatePost"],
      prohibitedKeywords: ["delve", "leverage"],
    },
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("1. Trajectory Evaluator Tests", () => {
    it("should pass trajectory evaluation for standard post creation workflow", () => {
      const recordedSteps = ["generateDraft", "reviewAndRefine", "runGuardrails", "validatePost"];
      const result = evaluateTrajectory(recordedSteps, ["generateDraft", "reviewAndRefine", "runGuardrails", "validatePost"]);

      expect(result.passed).toBe(true);
      expect(result.reason).toContain("matched expected node sequence");
    });

    it("should fail trajectory evaluation if guardrails step is skipped", () => {
      const recordedSteps = ["generateDraft", "reviewAndRefine", "validatePost"];
      const result = evaluateTrajectory(recordedSteps, ["generateDraft", "reviewAndRefine", "runGuardrails", "validatePost"]);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("missing expected node step 'runGuardrails'");
    });

    it("should evaluate trajectory for guardrail rejection on unsafe state", async () => {
      const mockLlm = new FakeListChatModel({ responses: ["UNSAFE"] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const guardrailRes = await runGuardrails({
        topic: "Unsafe Topic",
        draft: "UNSAFE content that violates policy",
      } as unknown as State);

      expect(guardrailRes.error).toBeDefined();
      expect(guardrailRes.error).toContain("Guardrail violation");
    });
  });

  describe("2. LLM-as-a-judge Evaluator Tests", () => {
    it("should give high quality score (1.0) to well-formatted LinkedIn post", () => {
      const highQualityPost = `Kafka consumer group rebalances tank throughput if max.poll.interval.ms is misconfigured.

We faced this during high load when database writes slowed down.
Tuning max.poll.records to 50 fixed the issue.

#kafka #backend #systemdesign`;

      const evalResult = judgePostQuality(highQualityPost);

      expect(evalResult.score).toBe(1.0);
      expect(evalResult.passed).toBe(true);
      expect(evalResult.feedback.buzzwordsFound).toEqual([]);
      expect(evalResult.feedback.hasHashtags).toBe(true);
      expect(evalResult.feedback.hookLengthValid).toBe(true);
    });

    it("should penalize posts containing banned corporate buzzwords", () => {
      const buzzwordPost = `Here is a game-changer insight to leverage your team's synergy today!

We delve into paradigm shifts.

#buzzwords`;

      const evalResult = judgePostQuality(buzzwordPost);

      expect(evalResult.feedback.buzzwordsFound).toContain("game-changer");
      expect(evalResult.feedback.buzzwordsFound).toContain("leverage");
      expect(evalResult.feedback.buzzwordsFound).toContain("synergy");
      expect(evalResult.score).toBeLessThan(1.0);
    });
  });

  describe("3. Batch Evaluation Pipeline", () => {
    it("should execute batch evaluation suite across dataset test cases", () => {
      const results = sampleEvalCases.map((tc) => {
        const sampleGeneratedDraft = `Tuning ${tc.topic} requires inspecting real query plans.

Avoid blind configuration defaults in production environments.

#engineering #${tc.domain}`;

        const trajResult = evaluateTrajectory(
          ["generateDraft", "reviewAndRefine", "runGuardrails", "validatePost"],
          tc.expectedTrajectory
        );
        const qualityResult = judgePostQuality(sampleGeneratedDraft);

        return {
          id: tc.id,
          trajPassed: trajResult.passed,
          qualityScore: qualityResult.score,
          qualityPassed: qualityResult.passed,
        };
      });

      expect(results.length).toBe(2);
      expect(results.every((r) => r.trajPassed && r.qualityPassed)).toBe(true);
    });
  });
});
