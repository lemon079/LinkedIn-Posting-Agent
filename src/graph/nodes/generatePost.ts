import { HumanMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "../../core/prompts";
import { createLLM } from "../../services/llm";
import type { State } from "../../core/state";
import { DOMAINS, inferDomain } from "../../core/domains";
import { getRecentHooks, addHook } from "../../services/history";
import { invokeWithTimeout } from "../../utils/llmTimeout";
import type { LangChainMessageBlock } from "@/interfaces/stream";

const getLLMOpts = (state: State) => ({
  provider: state.llmProvider || undefined,
  apiKey: state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 2048,
});

export async function planDraft(state: State): Promise<Partial<State>> {
  const llmOpts = getLLMOpts(state);
  const llm = createLLM(llmOpts);
  
  const rawDomain = state.domain || "auto";
  const activeDomainKey = rawDomain === "auto" ? inferDomain(state.topic) : rawDomain;
  const domainConfig = DOMAINS[activeDomainKey] || DOMAINS.tech;

  const prompt = `Analyze the following LinkedIn post topic and target domain, then outline 3 distinct content angles/hooks:
Topic: "${state.topic}"
Domain: ${domainConfig.name} (${domainConfig.description})
${state.context ? `Custom Context: "${state.context}"` : ""}

Format output clearly as a 3-point execution plan. Keep concise.`;

  try {
    const res = await invokeWithTimeout(llm.invoke([new HumanMessage(prompt)]));
    const plan = typeof res.content === "string" ? res.content : String(res.content);
    return { plan, activeDomain: activeDomainKey };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Plan generation failed";
    return { plan: `Default Strategy: 1. Core Problem 2. Technical Insight 3. Call to Action (${msg})`, activeDomain: activeDomainKey };
  }
}

export async function generateInitialDraft(state: State): Promise<Partial<State>> {
  const domainKey = state.activeDomain || "tech";
  const systemPrompt = getSystemPrompt(domainKey);
  const recentHooks = getRecentHooks();
  
  const prompt = `${systemPrompt}

Goal: Write an impactful LinkedIn post.
Topic: "${state.topic}"
Context: "${state.context || "None"}"
Plan/Outline: "${state.plan || "Direct high-value post"}"
Grounding Info: "${state.searchContext || "None"}"
Avoid Recently Used Hooks:
${recentHooks.length > 0 ? recentHooks.map(h => `- "${h}"`).join("\n") : "None"}

Generate the complete post inside [DRAFT] ... [/DRAFT] tags.`;

  try {
    const llm = createLLM(getLLMOpts(state));
    const res = await invokeWithTimeout(llm.invoke([
      new HumanMessage(prompt),
    ]));
    const output = typeof res.content === "string" 
      ? res.content 
      : Array.isArray(res.content) 
        ? res.content.map((b: LangChainMessageBlock | string) => (typeof b === "object" && b !== null && "text" in b ? String(b.text || "") : String(b))).join("\n") 
        : "";

    // Extract draft from tags
    const match = output.match(/\[DRAFT\]([\s\S]*?)\[\/\s*DRAFT\s*\]/i) || output.match(/\[DRAFT\]([\s\S]*)/i);
    let rawDraft = match ? match[1].trim() : output;
    
    // Explicitly strip any stray tags just in case
    rawDraft = rawDraft.replace(/\[\/?DRAFT\]/gi, "").replace(/\[\/?DRAFT\s*\n*\]/gi, "").trim();

    // Extract hook (first line) and save to history
    const hook = rawDraft.split("\n")[0]?.trim();
    if (hook && hook.length > 10) {
      addHook(hook);
    }

    return { draft: rawDraft };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown LLM error";
    return { error: msg };
  }
}

export async function reviewAndRefine(state: State): Promise<Partial<State>> {
  if (!state.draft) return {};

  const domainKey = state.activeDomain || "tech";
  const domainConfig = DOMAINS[domainKey] || DOMAINS.tech;

  const prompt = `You are an elite LinkedIn copy editor. Review and polish this post to maximize engagement, readability, and authority.

Topic: "${state.topic}"
Domain Guidelines: ${domainConfig.name} - ${domainConfig.description}
Current Draft:
"""
${state.draft}
"""

Checklist for polishing:
1. Ensure the first line is an irresistible hook (under 100 chars).
2. Ensure paragraph breaks are short (1-2 sentences per paragraph).
3. Ensure actionable value is crystal clear.
4. Ensure no buzzwords ("game-changer", "delve", "leverage", "paradigm shift").
5. Include 3-5 hyper-relevant hashtags at the end.

Output ONLY the final polished post inside [DRAFT] ... [/DRAFT] tags. Do not add introductory or conversational text.`;

  try {
    const llm = createLLM(getLLMOpts(state));
    const res = await invokeWithTimeout(llm.invoke([
      new HumanMessage(prompt),
    ]));
    const output = typeof res.content === "string" 
      ? res.content 
      : Array.isArray(res.content) 
        ? res.content.map((b: LangChainMessageBlock | string) => (typeof b === "object" && b !== null && "text" in b ? String(b.text || "") : String(b))).join("\n") 
        : "";

    const match = output.match(/\[DRAFT\]([\s\S]*?)\[\/\s*DRAFT\s*\]/i) || output.match(/\[DRAFT\]([\s\S]*)/i);
    let finalDraft = match ? match[1].trim() : output;
    finalDraft = finalDraft.replace(/\[\/?DRAFT\]/gi, "").replace(/\[\/?DRAFT\s*\n*\]/gi, "").trim();

    return { draft: finalDraft || state.draft };
  } catch {
    // If refinement fails, fallback gracefully to initial draft
    return { draft: state.draft };
  }
}
