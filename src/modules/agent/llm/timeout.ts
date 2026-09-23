export const DEFAULT_LLM_TIMEOUT_MS = 18000;
export const DRAFT_TIMEOUT_MS = 18000;
export const CROSS_PROVIDER_DRAFT_TIMEOUT_MS = 10000;
export const FALLBACK_DRAFT_TIMEOUT_MS = 10000;
export const INTAKE_TIMEOUT_MS = 10000;
export const CRITIC_TIMEOUT_MS = 10000;
export const CROSS_PROVIDER_CRITIC_TIMEOUT_MS = 6000;
export const REFINE_TIMEOUT_MS = 12000;
export const GUARDRAIL_TIMEOUT_MS = 5000;
export const CROSS_PROVIDER_GUARDRAIL_TIMEOUT_MS = 4000;

/**
 * Minimum viable timeout for any downstream LLM call.
 * Even when the global deadline is exhausted, we still grant this much time
 * so that lightweight safety/critique calls have a real chance to succeed
 * rather than being starved to an impossible 1s window.
 */
export const MIN_VIABLE_LLM_TIMEOUT_MS = 4000;

export function getRemainingTimeoutMs(
  deadlineTimestamp?: number | null,
  fallbackTimeoutMs: number = DEFAULT_LLM_TIMEOUT_MS,
  minTimeoutMs: number = MIN_VIABLE_LLM_TIMEOUT_MS
): number {
  if (!deadlineTimestamp) return fallbackTimeoutMs;
  const remaining = deadlineTimestamp - Date.now() - 1000; // 1s safety margin
  if (remaining <= minTimeoutMs) return minTimeoutMs;
  return Math.min(fallbackTimeoutMs, remaining);
}


export function isTransientLLMError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("rate limit") ||
    lower.includes("quota exceeded") ||
    lower.includes("resource_exhausted") ||
    lower.includes("spikes in demand") ||
    lower.includes("503") ||
    lower.includes("429") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("timed out")
  );
}

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

export interface RetryTimeoutOptions {
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  deadlineTimestamp?: number | null;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

export async function invokeWithRetryAndTimeout<T>(
  invokeFn: (signal: AbortSignal) => Promise<T>,
  opts: RetryTimeoutOptions = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 1;
  const initialDelayMs = opts.initialDelayMs ?? 400;
  const configuredTimeout = opts.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const timeoutMs = getRemainingTimeoutMs(opts.deadlineTimestamp, configuredTimeout);
    const controller = new AbortController();

    try {
      return await invokeWithTimeout(invokeFn(controller.signal), timeoutMs, controller);
    } catch (err) {
      lastError = err;
      const isTransient = isTransientLLMError(err);

      if (attempt < maxRetries && isTransient) {
        // Calculate exponential backoff with jitter
        const delay = initialDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        if (opts.deadlineTimestamp && Date.now() + delay >= opts.deadlineTimestamp) {
          // Deadline would be exceeded by waiting, throw immediately
          break;
        }
        if (opts.onRetry) {
          opts.onRetry(attempt + 1, err, delay);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Non-transient error or retries exhausted
      break;
    }
  }

  throw lastError;
}

