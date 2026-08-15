"use client";

import { useMemo } from "react";
import { useLocalRuntime, type ChatModelAdapter, type ChatModelRunResult } from "@assistant-ui/react";
import { getApiBaseUrl } from "@/lib/api/config";
import { cleanErrorMessage } from "@/lib/utils";

export interface AgentRuntimeOptions {
  customTopic: string;
  context: string;
  domain: string;
  provider: string;
  apiKey: string;
  modelName: string;
  ollamaBaseUrl: string;
  liToken: string;
  liUrn: string;
  token?: string | null;
  onDraftReceived?: (draft: string, reasoningSteps: Array<{ title: string; output: string }>, threadId: string) => void;
  onError?: (err: string) => void;
}

export function useAgentRuntime(options: AgentRuntimeOptions) {
  const {
    customTopic,
    context,
    domain,
    provider,
    apiKey,
    modelName,
    ollamaBaseUrl,
    liToken,
    liUrn,
    token,
    onDraftReceived,
    onError,
  } = options;

  const adapter = useMemo<ChatModelAdapter>(() => {
    return {
      async *run({ messages, abortSignal }) {
        // Extract prompt from latest user message or fallback to customTopic
        const latestUserMessage = messages.filter((m) => m.role === "user").pop();
        let promptTopic = customTopic;
        if (latestUserMessage && Array.isArray(latestUserMessage.content)) {
          const textPart = latestUserMessage.content.find((p) => p.type === "text");
          if (textPart && "text" in textPart && typeof textPart.text === "string" && textPart.text.trim()) {
            promptTopic = textPart.text.trim();
          }
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (provider) headers["x-llm-provider"] = provider;
        if (apiKey) headers["x-llm-api-key"] = apiKey;
        if (modelName) headers["x-llm-model"] = modelName;
        if (ollamaBaseUrl) headers["x-ollama-url"] = ollamaBaseUrl;
        if (liToken) headers["x-linkedin-token"] = liToken;
        if (liUrn) headers["x-linkedin-urn"] = liUrn;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
          const response = await fetch(`${getApiBaseUrl()}/api/draft`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              topic: promptTopic,
              context,
              domain: domain === "auto" ? null : domain,
            }),
            signal: abortSignal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(cleanErrorMessage(errorText));
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("ReadableStream not supported in this browser.");

          const decoder = new TextDecoder();
          let buffer = "";
          let accumulatedDraft = "";
          let accumulatedReasoning = "";
          const reasoningSteps: Array<{ title: string; output: string }> = [];
          let currentThreadId = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === "thread") {
                  currentThreadId = event.threadId;
                } else if (event.type === "node_start") {
                  if (!reasoningSteps.some((s) => s.title === event.title)) {
                    reasoningSteps.push({ title: event.title, output: "" });
                  }
                } else if (event.type === "token" || event.type === "thinking") {
                  const nodeTitle = event.type === "thinking" ? "Model Thinking" : event.node || "Reasoning";
                  let step = reasoningSteps.find((s) => s.title === nodeTitle);
                  if (!step) {
                    step = { title: nodeTitle, output: "" };
                    reasoningSteps.push(step);
                  }
                  step.output += event.text;
                  accumulatedReasoning += event.text;

                  // Yield reasoning update to assistant-ui
                  const result: ChatModelRunResult = {
                    content: [
                      {
                        type: "reasoning",
                        text: accumulatedReasoning,
                      },
                    ],
                  };
                  yield result;
                } else if (event.type === "final") {
                  accumulatedDraft = event.draft;
                  if (event.reasoningSteps) {
                    reasoningSteps.length = 0;
                    reasoningSteps.push(...event.reasoningSteps);
                  }
                  if (event.threadId) {
                    currentThreadId = event.threadId;
                  }

                  onDraftReceived?.(accumulatedDraft, reasoningSteps, currentThreadId);

                  // Yield final response text
                  const finalResult: ChatModelRunResult = {
                    content: [
                      {
                        type: "reasoning",
                        text: accumulatedReasoning,
                      },
                      {
                        type: "text",
                        text: accumulatedDraft,
                      },
                    ],
                  };
                  yield finalResult;
                } else if (event.type === "error") {
                  throw new Error(cleanErrorMessage(event.message));
                }
              } catch (e) {
                if (e instanceof Error && e.message.includes("cleanErrorMessage")) {
                  throw e;
                }
                console.error("Failed to parse assistant stream event:", e);
              }
            }
          }
        } catch (err: unknown) {
          const rawMsg = err instanceof Error ? err.message : "Unknown generation error";
          const cleaned = cleanErrorMessage(rawMsg);
          onError?.(cleaned);
          throw new Error(cleaned);
        }
      },
    };
  }, [
    customTopic,
    context,
    domain,
    provider,
    apiKey,
    modelName,
    ollamaBaseUrl,
    liToken,
    liUrn,
    token,
    onDraftReceived,
    onError,
  ]);

  const runtime = useLocalRuntime(adapter);

  return runtime;
}
