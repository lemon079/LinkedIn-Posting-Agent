export const DEFAULT_LLM_TIMEOUT_MS = 60000;
export const DRAFT_TIMEOUT_MS = 60000;
export const FALLBACK_DRAFT_TIMEOUT_MS = 25000;
export const INTAKE_TIMEOUT_MS = 30000;
export const CRITIC_TIMEOUT_MS = 35000;
export const REFINE_TIMEOUT_MS = 45000;
export const GUARDRAIL_TIMEOUT_MS = 20000;

export async function invokeWithTimeout<T>(
  llmInvokePromise: Promise<T>,
  timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS,
  abortController?: AbortController
): Promise<T> {
  if (abortController?.signal?.aborted) {
    throw new Error("LLM invocation was aborted prior to execution");
  }

  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      try {
        if (abortController && !abortController.signal.aborted) {
          abortController.abort();
        }
      } catch {}
      reject(new Error(`LLM invocation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    if (typeof timeoutHandle.unref === "function") {
      timeoutHandle.unref();
    }
  });

  try {
    return await Promise.race([llmInvokePromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

