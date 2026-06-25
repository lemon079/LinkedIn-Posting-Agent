import { createLLM } from "./llm";
import { HumanMessage } from "@langchain/core/messages";
import { DEFAULT_OLLAMA_URL } from "@/lib/constants";
import type { HealthResult } from "../types/index.js";

export const checkConnection = async (
  provider: string, apiKey?: string, model?: string, ollamaBaseUrl?: string
): Promise<HealthResult> => {
  try {
    if (provider === "ollama") {
      const base = ollamaBaseUrl || DEFAULT_OLLAMA_URL;
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) return { ok: false, error: `Ollama unreachable (${res.status})` };
      const data = await res.json() as { models: { name: string }[] };
      const names = data.models?.map((m) => m.name) || [];
      if (model && !names.some((n) => n.startsWith(model))) {
        return { ok: false, error: `Model "${model}" not found. Available: ${names.join(", ")}`, models: names };
      }
      return { ok: true, models: names };
    }
    const llm = createLLM({ provider, apiKey, model, ollamaBaseUrl });
    await llm.invoke([new HumanMessage("Say OK")]);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return { ok: false, error: msg };
  }
};
