import { useState, useEffect } from "react";
import { publishPost } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api/config";
import { cleanErrorMessage } from "@/lib/utils";
import type { CustomKeys } from "@/types";
import { useAgentSettings } from "./useAgentSettings";
import { useAgentMedia } from "./useAgentMedia";

export function useAgent() {
  const [customTopic, setCustomTopic] = useState("");
  const [context, setContext] = useState("");
  const [domain, setDomain] = useState("auto");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [reasoningSteps, setReasoningSteps] = useState<Array<{ title: string; output: string }>>([]);
  const [status, setStatus] = useState({ gen: false, pub: false, err: null as string | null });

  // Sub-hooks
  const settings = useAgentSettings();
  const media = useAgentMedia(settings.token);

  // Hydrate workspace state from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    queueMicrotask(() => {
      const savedTopic = localStorage.getItem("praxis_custom_topic");
      if (savedTopic) setCustomTopic(savedTopic);

      const savedContext = localStorage.getItem("praxis_context");
      if (savedContext) setContext(savedContext);

      const savedDomain = localStorage.getItem("praxis_domain");
      if (savedDomain) setDomain(savedDomain);

      const savedDraft = localStorage.getItem("praxis_draft_text");
      if (savedDraft) setDraftText(savedDraft);

      const savedThread = localStorage.getItem("praxis_thread_id");
      if (savedThread) setThreadId(savedThread);

      const savedSteps = localStorage.getItem("praxis_reasoning_steps");
      if (savedSteps) {
        try {
          setReasoningSteps(JSON.parse(savedSteps));
        } catch {}
      }
    });
  }, []);

  // Automatically persist draft and workspace state across page reloads
  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    localStorage.setItem("praxis_custom_topic", customTopic);
  }, [customTopic, settings.isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    localStorage.setItem("praxis_context", context);
  }, [context, settings.isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    localStorage.setItem("praxis_domain", domain);
  }, [domain, settings.isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    if (draftText) {
      localStorage.setItem("praxis_draft_text", draftText);
    } else {
      localStorage.removeItem("praxis_draft_text");
    }
  }, [draftText, settings.isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    if (threadId) {
      localStorage.setItem("praxis_thread_id", threadId);
    } else {
      localStorage.removeItem("praxis_thread_id");
    }
  }, [threadId, settings.isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    if (reasoningSteps.length > 0) {
      localStorage.setItem("praxis_reasoning_steps", JSON.stringify(reasoningSteps));
    } else {
      localStorage.removeItem("praxis_reasoning_steps");
    }
  }, [reasoningSteps, settings.isHydrated]);

  const handleGenerate = async (customInstruction?: string) => {
    setStatus({ gen: true, pub: false, err: null });
    setDraftText(null);
    setStreamingText("");
    setPostUrl(null);
    setReasoningSteps([]);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (settings.token) {
        headers["Authorization"] = `Bearer ${settings.token}`;
      } else {
        if (settings.provider) headers["x-llm-provider"] = settings.provider;
        if (settings.apiKey) headers["x-llm-api-key"] = settings.apiKey;
        if (settings.modelName) headers["x-llm-model"] = settings.modelName;
        if (settings.ollamaBaseUrl) headers["x-ollama-base-url"] = settings.ollamaBaseUrl;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic: customTopic || undefined,
          context: context
            ? `${context}${customInstruction ? `\n\nInstructions: ${customInstruction}` : ""}`
            : customInstruction || undefined,
          domain: domain === "auto" ? undefined : domain,
          keys: {
            provider: settings.provider,
            apiKey: settings.apiKey || undefined,
            modelName: settings.modelName || undefined,
            ollamaBaseUrl: settings.ollamaBaseUrl || undefined,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          settings.setToken(null);
          settings.setUser(null);
          throw new Error("Your session has expired. Please sign in again.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received from stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "thread") {
              setThreadId(event.threadId);
            } else if (event.type === "node_start") {
              setReasoningSteps((prev) => {
                if (prev.some((s) => s.title === event.title)) return prev;
                return [...prev, { title: event.title, output: "" }];
              });
            } else if (event.type === "token" || event.type === "thinking") {
              setReasoningSteps((prev) => {
                const stepIdx = prev.findIndex((s) => s.title === event.node);
                if (stepIdx === -1) {
                  return [...prev, { title: event.node, output: event.text }];
                }
                const next = [...prev];
                next[stepIdx] = {
                  ...next[stepIdx],
                  output: next[stepIdx].output + event.text,
                };
                return next;
              });
            } else if (event.type === "final") {
              setStreamingText(event.draft);
              setReasoningSteps(event.reasoningSteps || []);
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (e) {
            console.error("Failed to parse event:", e);
          }
        }
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "Unknown error";
      setStatus((p) => ({ ...p, err: cleanErrorMessage(rawMsg) }));
    } finally {
      setStatus((p) => ({ ...p, gen: false }));
    }
  };

  const handlePublish = async (contentToPublish?: string) => {
    const finalContent =
      contentToPublish !== undefined ? contentToPublish : draftText || streamingText;
    if (!finalContent) {
      setStatus((p) => ({ ...p, err: "No draft content to publish." }));
      return;
    }
    if (!threadId) {
      setStatus((p) => ({ ...p, err: "No active thread ID. Please generate a draft first." }));
      return;
    }

    setStatus({ gen: false, pub: true, err: null });

    try {
      const keysPayload: CustomKeys = settings.token
        ? {
            token: settings.token,
            liToken: settings.liToken || undefined,
            liUrn: settings.liUrn || undefined,
          }
        : {
            liToken: settings.liToken || undefined,
            liUrn: settings.liUrn || undefined,
          };

      const res = await publishPost(threadId, finalContent, keysPayload, media.selectedFiles);

      if (res.error) {
        setStatus((p) => ({ ...p, err: res.error || "Publishing failed." }));
      } else if (res.postUrl) {
        setPostUrl(res.postUrl);
        media.clearFiles();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        settings.setToken(null);
        settings.setUser(null);
        setStatus((p) => ({ ...p, err: "Your session has expired. Please sign in again." }));
        return;
      }
      const rawMsg = err instanceof Error ? err.message : "Failed to publish post.";
      setStatus((p) => ({ ...p, err: cleanErrorMessage(rawMsg) }));
    } finally {
      setStatus((p) => ({ ...p, pub: false }));
    }
  };

  const handleUploadFile = (file: File) => {
    setStatus((p) => ({ ...p, err: null }));
    media.handleUploadFile(file, (msg) => {
      setStatus((p) => ({ ...p, err: msg }));
    });
  };

  const handleClearDraft = () => {
    setDraftText(null);
    setStreamingText(null);
    setThreadId(null);
    setReasoningSteps([]);
    media.clearFiles();
    if (typeof window !== "undefined") {
      localStorage.removeItem("praxis_draft_text");
      localStorage.removeItem("praxis_thread_id");
      localStorage.removeItem("praxis_reasoning_steps");
    }
  };

  const handleNewPost = () => {
    setPostUrl(null);
    setDraftText(null);
    setStreamingText(null);
    setThreadId(null);
    setReasoningSteps([]);
    media.clearFiles();
    setCustomTopic("");
    setContext("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("praxis_draft_text");
      localStorage.removeItem("praxis_thread_id");
      localStorage.removeItem("praxis_reasoning_steps");
      localStorage.removeItem("praxis_custom_topic");
      localStorage.removeItem("praxis_context");
    }
  };

  return {
    customTopic,
    context,
    domain,
    draftText,
    streamingText,
    threadId,
    postUrl,
    activeTab,
    isGenerating: status.gen,
    isPublishing: status.pub,
    error: status.err,
    provider: settings.provider,
    apiKey: settings.apiKey,
    modelName: settings.modelName,
    ollamaBaseUrl: settings.ollamaBaseUrl,
    liToken: settings.liToken,
    liUrn: settings.liUrn,
    liTokenExpiresAt: settings.liTokenExpiresAt,
    isSettingsOpen: settings.isSettingsOpen,
    user: settings.user,
    token: settings.token,
    selectedFiles: media.selectedFiles,
    isUploading: media.isUploading,
    reasoningSteps,
    setCustomTopic,
    setContext,
    setDomain,
    setDraftText,
    setStreamingText,
    setActiveTab,
    setProvider: settings.setProvider,
    setApiKey: settings.setApiKey,
    setModelName: settings.setModelName,
    setOllamaBaseUrl: settings.setOllamaBaseUrl,
    setLiToken: settings.setLiToken,
    setLiUrn: settings.setLiUrn,
    setIsSettingsOpen: settings.setIsSettingsOpen,
    setSelectedFiles: media.setSelectedFiles,
    setReasoningSteps,
    handleGenerate,
    handlePublish,
    handleUploadFile,
    handleClearDraft,
    handleNewPost,
  };
}
