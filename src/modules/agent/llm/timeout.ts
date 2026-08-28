export async function invokeWithTimeout<T>(
  llmInvokePromise: Promise<T>,
  timeoutMs: number = 60000
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`LLM invocation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([llmInvokePromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}
