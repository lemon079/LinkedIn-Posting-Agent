import { createLLM, isMaskedOrInvalid } from "./factory";
import { HumanMessage } from "@langchain/core/messages";
import { DEFAULT_OLLAMA_URL } from "@/lib/constants";
import { validateSafeUrl } from "@/lib/security/urlValidation";
import type { HealthResult } from "@/types/health";
import axios from "axios";

export const checkConnection = async (
  provider: string,
  apiKey?: string,
  model?: string,
  ollamaBaseUrl?: string
): Promise<HealthResult> => {
  try {
    if (provider === "ollama") {
      const rawBase = ollamaBaseUrl || DEFAULT_OLLAMA_URL;
      const validation = validateSafeUrl(rawBase);
      if (!validation.isValid || !validation.sanitizedUrl) {
        return {
          ok: false,
          error: validation.error || "Invalid Ollama base URL.",
        };
      }
      const base = validation.sanitizedUrl;
      try {
        const res = await axios.get(`${base}/api/tags`, { timeout: 5000 });
        const data = res.data as { models: { name: string }[] };
        const names = data.models?.map((m) => m.name) || [];
        if (model && !names.some((n) => n === model || n.startsWith(model + ":") || n.startsWith(model))) {
          return {
            ok: false,
            error:
              names.length > 0
                ? `Model "${model}" not found in Ollama. Run 'ollama pull ${model}' in your terminal. Available: ${names.join(", ")}`
                : `Ollama is running on ${base}, but no models are installed. Run 'ollama pull ${model || "llama3.1"}' in your terminal.`,
            models: names,
          };
        }
        return { ok: true, models: names };
      } catch (err: unknown) {
        const errObj = err as { code?: string; message?: string };
        if (
          errObj.code === "ECONNREFUSED" ||
          errObj.message?.includes("ECONNREFUSED") ||
          errObj.message?.includes("Network Error")
        ) {
          return {
            ok: false,
            error: `Ollama service is not running on ${base}. Please ensure Ollama is running locally and try again.`,
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

    let discoveredModels: string[] | undefined = undefined;
    const safeKey = isMaskedOrInvalid(apiKey) ? undefined : apiKey;
    if (provider === "openai" && safeKey) {
      try {
        const modelsRes = await axios.get("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${safeKey}` },
          timeout: 4000,
        });
        const all = (modelsRes.data?.data as { id: string }[]) || [];
        discoveredModels = all
          .map((m) => m.id)
          .filter((id) => id.startsWith("gpt-") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("chatgpt"))
          .sort();
      } catch {
        // Non-blocking: model list fetch is best-effort
      }
    } else if (provider === "gemini" && safeKey) {
      try {
        const modelsRes = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${safeKey}`,
          { timeout: 4000 }
        );
        const all = (modelsRes.data?.models as { name: string }[]) || [];
        discoveredModels = all
          .map((m) => m.name.replace(/^models\//, ""))
          .filter((name) => name.startsWith("gemini-"))
          .sort();
      } catch {
        // Non-blocking: model list fetch is best-effort
      }
    }

    return { ok: true, models: discoveredModels };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return { ok: false, error: msg };
  }
};
