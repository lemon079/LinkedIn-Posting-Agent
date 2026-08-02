import { createLLM } from "@/services/llm";
import { HumanMessage } from "@langchain/core/messages";
import { DEFAULT_OLLAMA_URL } from "@/lib/constants";
import type { HealthResult } from "@/interfaces";
import axios from "axios";

export const checkConnection = async (
  provider: string, apiKey?: string, model?: string, ollamaBaseUrl?: string
): Promise<HealthResult> => {
  try {
    if (provider === "ollama") {
      const base = ollamaBaseUrl || DEFAULT_OLLAMA_URL;
      try {
        const res = await axios.get(`${base}/api/tags`, { timeout: 5000 });
        const data = res.data as { models: { name: string }[] };
        const names = data.models?.map((m) => m.name) || [];
        if (model && !names.some((n) => n === model || n.startsWith(model + ":") || n.startsWith(model))) {
          return {
            ok: false,
            error: names.length > 0
              ? `Model "${model}" not found in Ollama. Run 'ollama pull ${model}' in your desktop terminal. Available: ${names.join(", ")}`
              : `Ollama is running on ${base}, but no models are installed. Run 'ollama pull ${model || "llama3.1"}' in your terminal.`,
            models: names,
          };
        }
        return { ok: true, models: names };
      } catch (err: unknown) {
        const errObj = err as { code?: string; message?: string };
        if (errObj.code === "ECONNREFUSED" || errObj.message?.includes("ECONNREFUSED") || errObj.message?.includes("Network Error")) {
          return {
            ok: false,
            error: `Ollama service is not running on ${base}. Please start Ollama on your desktop app and try again.`,
          };
        }
        return {
          ok: false,
          error: errObj.message || `Failed to connect to Ollama service on ${base}.`,
        };
      }
    }
    const llm = createLLM({ provider, apiKey, model, ollamaBaseUrl });
    await llm.invoke([new HumanMessage("Say OK")]);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return { ok: false, error: msg };
  }
};
