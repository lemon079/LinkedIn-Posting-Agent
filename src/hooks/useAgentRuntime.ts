"use client";

import { useMemo } from "react";
import axios from "axios";
import { useLocalRuntime, type ChatModelAdapter, type ChatModelRunResult } from "@assistant-ui/react";
import { getApiBaseUrl } from "@/lib/api/config";
import { cleanErrorMessage } from "@/lib/utils";
import type { StreamEvent, HookOption } from "@/types";

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
  currentDraft?: string;
  threadId?: string;
  alternativeHooks?: HookOption[];
  onDraftReceived?: (
    draft: string,
    reasoningSteps: Array<{ title: string; output: string }>,
    threadId: string,
    changeNote?: string,
    alternativeHooks?: HookOption[]
  ) => void;
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
    currentDraft,
    threadId,
    alternativeHooks,
    onDraftReceived,
    onError,
  } = options;

  const adapter: ChatModelAdapter = useMemo(() => {
    return {
      async *run({ messages, abortSignal }) {
        // Extract the user prompt from the latest user message
        let promptTopic = customTopic;
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg.role === "user") {
            const content = lastMsg.content;
            if (typeof content === "string") {
              promptTopic = content;
            } else if (Array.isArray(content)) {
              promptTopic = content
                .filter((p) => p.type === "text")
                .map((p) => ("text" in p ? p.text : ""))
                .join("\n");
            }
          }
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (provider) headers["x-llm-provider"] = provider;
        if (apiKey) headers["x-llm-api-key"] = apiKey;
        if (modelName) headers["x-llm-model"] = modelName;
        if (ollamaBaseUrl) {
          headers["x-ollama-url"] = ollamaBaseUrl;
          headers["x-ollama-base-url"] = ollamaBaseUrl;
        }
        if (liToken) headers["x-linkedin-token"] = liToken;
        if (liUrn) headers["x-linkedin-urn"] = liUrn;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
          let stream: ReadableStream<Uint8Array>;
          try {
            const response = await axios.post<ReadableStream<Uint8Array>>(
              `${getApiBaseUrl()}/api/draft`,
              {
                topic: promptTopic,
                context,
                domain: domain === "auto" ? null : domain,
                threadId: threadId || undefined,
                currentDraft: currentDraft || undefined,
                followUpMessage: promptTopic,
                alternativeHooks: alternativeHooks || undefined,
                messages: messages.map((m) => ({
                  role: m.role,
                  content:
                    typeof m.content === "string"
                      ? m.content
                      : Array.isArray(m.content)
                      ? m.content
                          .filter((p) => p.type === "text")
                          .map((p) => ("text" in p ? p.text : ""))
                          .join("\n")
                      : "",
                })),
              },
              {
                headers,
                signal: abortSignal,
                adapter: "fetch",
                responseType: "stream",
              }
            );

            if (!response.data) {
              throw new Error("ReadableStream not supported or empty response.");
            }
            stream = response.data;
          } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
              const errorText =
                (err.response?.data && typeof err.response.data === "object" && "error" in err.response.data
                  ? (err.response.data as { error?: string }).error
                  : undefined) || err.message;
              throw new Error(cleanErrorMessage(errorText));
            }
            throw err;
          }

          const reader = stream.getReader();
          if (!reader) throw new Error("ReadableStream not supported in this browser.");

          const decoder = new TextDecoder();
          let buffer = "";
          let accumulatedDraft = "";
          let accumulatedReasoning = "";
          let latestChangeNote = "";
          let receivedAlternativeHooks: HookOption[] = [];
          const reasoningSteps: Array<{ title: string; output: string }> = [];
          let currentThreadId = threadId || "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();

              let event: StreamEvent;
              try {
                event = JSON.parse(jsonStr);
              } catch (e) {
                console.warn("Skipping unparseable assistant stream event:", jsonStr, e);
                continue;
              }

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
              } else if (event.type === "chat_message") {
                const chatResult: ChatModelRunResult = {
                  content: [
                    ...(accumulatedReasoning ? [{ type: "reasoning" as const, text: accumulatedReasoning }] : []),
                    {
                      type: "text",
                      text: event.text,
                    },
                  ],
                };
                yield chatResult;
              } else if (event.type === "change_note") {
                latestChangeNote = event.note;
              } else if (event.type === "alternative_hooks") {
                receivedAlternativeHooks = event.hooks;
              } else if (event.type === "final") {
                accumulatedDraft = event.draft;
                if (event.reasoningSteps) {
                  reasoningSteps.length = 0;
                  reasoningSteps.push(...event.reasoningSteps);
                }
                if (event.threadId) {
                  currentThreadId = event.threadId;
                }
                const finalChangeNote = event.changeNote || latestChangeNote;
                const finalHooks =
                  event.alternativeHooks && event.alternativeHooks.length > 0
                    ? event.alternativeHooks
                    : receivedAlternativeHooks;

                onDraftReceived?.(accumulatedDraft, reasoningSteps, currentThreadId, finalChangeNote, finalHooks);

                // Yield final response text (change note in chat bubble if refined, or draft if initial)
                const displayText = finalChangeNote
                  ? `✨ **Draft Updated**\n\n${finalChangeNote}`
                  : accumulatedDraft;

                const finalResult: ChatModelRunResult = {
                  content: [
                    ...(accumulatedReasoning ? [{ type: "reasoning" as const, text: accumulatedReasoning }] : []),
                    {
                      type: "text",
                      text: displayText,
                    },
                  ],
                };
                yield finalResult;
              } else if (event.type === "error") {
                throw new Error(cleanErrorMessage(event.message));
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
    currentDraft,
    threadId,
    alternativeHooks,
    onDraftReceived,
    onError,
  ]);

  const runtime = useLocalRuntime(adapter);

  return runtime;
}
