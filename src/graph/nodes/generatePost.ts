import { HumanMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "../../core/prompts";
import { createLLM } from "../../services/llm";
import type { State } from "../../core/state";
import { DOMAINS, inferDomain } from "../../core/domains";
import { getRecentHooks, addHook } from "../../services/history";
import { invokeWithTimeout } from "../../utils/llmTimeout";

const getLLMOpts = (state: State) => ({
  provider: state.llmProvider || undefined,
  apiKey: state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 2048,
});

export const generateDraft = async (state: State): Promise<Partial<State>> => {
  try {
    const domainId = state.domain || inferDomain(state.topic, state.context);
    const domainConfig = DOMAINS[domainId as keyof typeof DOMAINS] || DOMAINS.general;
    const recentHooks = await getRecentHooks();

    const llm = createLLM(getLLMOpts(state));
    const prompt = `You are an expert LinkedIn ghostwriter for the ${domainConfig.label} domain.

Topic: "${state.topic}"
Additional context: "${state.context}"

Your task has two parts. Do both in a SINGLE response:

PART 1 — OUTLINE (think through this briefly):
- The key specific detail to focus on: ${domainConfig.specificityDescription}
- The core tradeoff, hard-won lesson, or non-obvious behavior.
- A target outline/flow for the post.

PART 2 — DRAFT:
Using the outline above, write the full LinkedIn post draft.

System / Style Guidelines:
${getSystemPrompt(domainConfig, recentHooks)}

Draft the post to be accurate, conversational, and aligned with the constraints.
At the very end of your response, output the draft text wrapped in [DRAFT] ... [/DRAFT] tags.`;

    const res = await invokeWithTimeout(llm.invoke([
      new HumanMessage(prompt),
    ]));
    const output = typeof res.content === "string" 
      ? res.content 
      : Array.isArray(res.content) 
        ? res.content.map((b: unknown) => (typeof b === "object" && b !== null && "text" in b ? String((b as { text: unknown }).text || "") : "")).join("\n") 
        : "";

    // Extract draft from tags
    const match = output.match(/\[DRAFT\]([\s\S]*?)\[\/\s*DRAFT\s*\]/i) || output.match(/\[DRAFT\]([\s\S]*)/i);
    let rawDraft = match ? match[1].trim() : output;
    
    // Explicitly strip any stray tags just in case
    rawDraft = rawDraft.replace(/\[\/?DRAFT\]/gi, "").replace(/\[\/?DRAFT\s*\n*\]/gi, "").trim();

    return {
      domain: domainId,
      draftOutput: rawDraft,
      reasoningSteps: [{
        title: "Planning & Drafting",
        output: `Analyzed topic **${state.topic}** for the ${domainConfig.label} domain, formulated an outline, and drafted the initial copy in a single pass.`
      }]
    };
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Unknown error in generateDraft"
    };
  }
};

export const reviewAndRefine = async (state: State): Promise<Partial<State>> => {
  try {
    const llm = createLLM(getLLMOpts(state));
    const initialDraft = state.draftOutput || "";
    const domainId = state.domain || "general";
    const domainConfig = DOMAINS[domainId as keyof typeof DOMAINS] || DOMAINS.general;

    const reviewPrompt = `You are a senior editor for the ${domainConfig.label} domain. Review and refine this initial draft for a LinkedIn post:

"${initialDraft}"

Review and edit the draft against these strict rules:
1. Length: 100-150 words.
2. Emojis: 0 to 2 emojis inline. Never rocket, fire, lightbulb, or clapping hands.
3. Formatting: Blank line between paragraphs, no Markdown bold/italic (** or __), no hashtags except max 3 at the very end.
4. Tone: Conversational first-person tone, no corporate buzzwords.
5. Accuracy: Grounded in specific details (${domainConfig.specificityDescription}).

Output two sections:
1. Critique: Explain what was changed or polished (e.g. emoji count, markdown removal, word limit adjustment).
2. Polished Post: The final ready-to-publish post.

At the very end of your response, output the final post text wrapped in [POLISHED_POST] ... [/POLISHED_POST] tags.`;

    const res = await invokeWithTimeout(llm.invoke([
      new HumanMessage(reviewPrompt),
    ]));
    const output = typeof res.content === "string" 
      ? res.content 
      : Array.isArray(res.content) 
        ? res.content.map((b: unknown) => (typeof b === "object" && b !== null && "text" in b ? String((b as { text: unknown }).text || "") : "")).join("\n") 
        : "";

    // Extract polished post
    // The LLM sometimes breaks the tag with a newline like [/POLISHED_\nPOST]
    const match = output.match(/\[POLISHED_POST\]([\s\S]*?)\[\/\s*POLISHED_POST\s*\]/i) || output.match(/\[POLISHED_POST\]([\s\S]*)/i);
    let polishedPost = match ? match[1].trim() : "";
    
    if (!polishedPost) {
      const lines = output.split("\n");
      const polishedStartIndex = lines.findIndex(l => l.toLowerCase().includes("polished post:"));
      if (polishedStartIndex !== -1) {
        polishedPost = lines.slice(polishedStartIndex + 1).join("\n").trim();
      } else {
        polishedPost = output;
      }
    }

    // Explicitly strip any stray tags just in case
    polishedPost = polishedPost.replace(/\[\/?POLISHED_POST\]/gi, "").replace(/\[\/?POLISHED_\s*\n*POST\]/gi, "").trim();

    polishedPost = polishedPost
      .replace(/\*\*|__/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .trim();

    // Store the hook to prevent future repetition
    const hookLine = polishedPost.split('\n')[0]?.trim();
    if (hookLine) {
      await addHook(hookLine);
    }

    return {
      postContent: polishedPost,
      reasoningSteps: [{
        title: "Review & Polish",
        output: `Polished the draft against formatting guidelines, adjusted emoji count, and verified final word count constraints.`
      }]
    };
  } catch (error: unknown) {
    let msg = error instanceof Error ? error.message : "Unknown error in generateDraft";
    if (state.llmProvider === "ollama") {
      const base = state.ollamaBaseUrl || "http://localhost:11434";
      if (msg.includes("ECONNREFUSED") || msg.includes("Failed to fetch") || msg.includes("fetch failed") || msg.includes("Network Error")) {
        msg = `Ollama service is not running on ${base}. Please start Ollama on your desktop app and try again.`;
      } else if (msg.includes("404") || msg.includes("not found")) {
        const m = state.llmModel || "specified model";
        msg = `Model "${m}" not found in Ollama. Run 'ollama pull ${m}' in your desktop terminal.`;
      } else {
        msg = `Ollama error: ${msg}`;
      }
    }
    return {
      error: msg
    };
  }
};
