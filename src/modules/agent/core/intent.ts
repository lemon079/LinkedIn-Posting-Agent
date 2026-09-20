export type IntentType = "refine" | "new_post" | "question" | "missing_metric";

export interface ClassifyIntentInput {
  message: string;
  currentDraft?: string | null;
  topic?: string;
  context?: string;
}

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  reason: string;
  targetScope: "hook_only" | "body_only" | "length" | "tone" | "general" | "none";
  changeNote?: string;
  conversationalReply?: string;
}

/**
 * Classifies user intent from a follow-up composer message.
 *
 * Enforces non-negotiable anti-fabrication rules:
 * - If user requests "add metrics" but supplies no real numbers, classifies as missing_metric
 *   and generates a conversational prompt for real figures rather than inventing fake data.
 */
export function classifyIntent(
  inputOrMessage: ClassifyIntentInput | string,
  currentDraftArg?: string | null
): IntentClassification {
  const input: ClassifyIntentInput =
    typeof inputOrMessage === "string"
      ? { message: inputOrMessage, currentDraft: currentDraftArg }
      : inputOrMessage;

  const rawMsg = (input.message || "").trim();
  const lowerMsg = rawMsg.toLowerCase();
  const hasDraft = Boolean(input.currentDraft && input.currentDraft.trim().length > 0);

  // 1. If no draft exists yet, any input is a new post request
  if (!hasDraft) {
    return {
      intent: "new_post",
      confidence: 1.0,
      reason: "No active draft exists in workspace",
      targetScope: "none",
    };
  }

  // 2. Explicit new post requests
  const newPostPatterns = [
    /^(?:write|create|draft|generate)\s+(?:a\s+)?(?:new\s+)?post\s+(?:about|on|discussing)\b/i,
    /^(?:start\s+over|scratch\s+that|let's\s+start\s+fresh|new\s+topic)\b/i,
    /^(?:different\s+topic|another\s+post)\b/i,
  ];

  if (newPostPatterns.some((p) => p.test(rawMsg))) {
    return {
      intent: "new_post",
      confidence: 0.95,
      reason: "User explicitly requested a new post or topic",
      targetScope: "none",
    };
  }

  // 3. Check for "add metrics / numbers / stats" requests without actual numeric values
  const asksForMetrics =
    /\b(?:add|include|put|give\s+me)\b.*\b(?:metrics|numbers|stats|statistics|percentages|benchmark\s+numbers|dollar\s+amounts)\b/i.test(
      lowerMsg
    ) || /\b(?:more\s+metrics|more\s+numbers|quantitative\s+data)\b/i.test(lowerMsg);

  const containsNumericValue = /\b\d+(?:\.\d+)?%?|\b(?:\$|€|£)\d+/i.test(rawMsg);

  if (asksForMetrics && !containsNumericValue) {
    return {
      intent: "missing_metric",
      confidence: 0.9,
      reason: "User requested metrics but provided no concrete figures; cannot fabricate numbers",
      targetScope: "none",
      conversationalReply:
        "I'd be glad to highlight concrete metrics! To maintain practitioner credibility and avoid inventing synthetic numbers, what specific figures did your team see? (For example: % latency reduction, throughput req/s, or cost savings percentage)",
    };
  }

  // 4. General informational questions / queries
  const questionPatterns = [
    /^(?:what|how|why|who|where|when)\s+(?:is|are|does|do|can|should|would)\b/i,
    /^(?:can\s+you\s+explain|could\s+you\s+clarify|tell\s+me\s+about)\b/i,
    /^(?:how\s+does\s+(?:this|linkedin|the\s+agent)\s+work)\b/i,
  ];

  const editClues = [
    /\b(?:make\s+it|rewrite|change|shorten|cut|tighten|expand|polish|punchier|hook|tone|post|draft)\b/i,
  ];

  const isQuestion = questionPatterns.some((p) => p.test(rawMsg));
  const hasEditClue = editClues.some((p) => p.test(rawMsg));

  if (isQuestion && !hasEditClue) {
    return {
      intent: "question",
      confidence: 0.85,
      reason: "User asked an informational question not intended as a post rewrite",
      targetScope: "none",
      conversationalReply: `Regarding "${rawMsg}": This draft workspace focuses on refining your current LinkedIn post. You can ask me to sharpen the hook, cut wordiness, adjust the tone, or supply specific data points you'd like woven into the post!`,
    };
  }

  // 5. Scoped Refinements
  let targetScope: IntentClassification["targetScope"] = "general";
  let changeNote = "Refined draft based on your instructions";

  if (/\b(?:hook|opening|first\s+line|first\s+sentence|opener)\b/i.test(lowerMsg)) {
    targetScope = "hook_only";
    changeNote = "Sharpened opening hook to increase scroll-stopping tension";
  } else if (/\b(?:shorter|cut|condense|trim|tighten|briefer|concise|reduce\s+length|too\s+long)\b/i.test(lowerMsg)) {
    targetScope = "length";
    changeNote = "Trimmed unnecessary filler and condensed body paragraphs for tighter pacing";
  } else if (/\b(?:punchier|bolder|more\s+authoritative|less\s+formal|more\s+casual|authentic|voice|tone)\b/i.test(lowerMsg)) {
    targetScope = "tone";
    changeNote = "Recalibrated tone and rhythm for punchier human cadence";
  } else if (/\b(?:outcome|result|takeaway|conclusion|actionable|impact)\b/i.test(lowerMsg)) {
    targetScope = "body_only";
    changeNote = "Emphasized concrete practitioner outcomes and operational takeaway";
  }

  return {
    intent: "refine",
    confidence: 0.9,
    reason: "User requested a natural language refinement of the current draft",
    targetScope,
    changeNote,
  };
}
