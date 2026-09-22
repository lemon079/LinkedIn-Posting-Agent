import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { publishPost } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api/config";
import { cleanErrorMessage } from "@/lib/utils";
import type { CustomKeys, StreamEvent, HookOption, DraftVersion } from "@/types";
import { useAgentSettings } from "./useAgentSettings";
import { useAgentMedia } from "./useAgentMedia";

export function useAgent() {
  const [customTopic, setCustomTopic] = useState("");
  const [context, setContext] = useState("");
  const [domain, setDomain] = useState("auto");
  const [archetype, setArchetype] = useState("auto");
  const [tone, setTone] = useState("conversational");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [reasoningSteps, setReasoningSteps] = useState<Array<{ title: string; output: string }>>([]);
  const [alternativeHooks, setAlternativeHooks] = useState<HookOption[]>([]);
  const [draftVersions, setDraftVersions] = useState<DraftVersion[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);
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

      const savedArchetype = localStorage.getItem("praxis_archetype");
      if (savedArchetype) setArchetype(savedArchetype);

      const savedTone = localStorage.getItem("praxis_tone");
      if (savedTone) setTone(savedTone);

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

      const savedHooks = localStorage.getItem("praxis_alternative_hooks");
      if (savedHooks) {
        try {
          setAlternativeHooks(JSON.parse(savedHooks));
        } catch {}
      }

      const savedVersions = localStorage.getItem("praxis_draft_versions");
      if (savedVersions) {
        try {
          const parsed = JSON.parse(savedVersions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDraftVersions(parsed);
            setActiveVersionIndex(parsed.length - 1);
          }
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
    localStorage.setItem("praxis_archetype", archetype);
  }, [archetype, settings.isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    localStorage.setItem("praxis_tone", tone);
  }, [tone, settings.isHydrated]);

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

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    if (alternativeHooks.length > 0) {
      localStorage.setItem("praxis_alternative_hooks", JSON.stringify(alternativeHooks));
    } else {
      localStorage.removeItem("praxis_alternative_hooks");
    }
  }, [alternativeHooks, settings.isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !settings.isHydrated.current) return;
    if (draftVersions.length > 0) {
      localStorage.setItem("praxis_draft_versions", JSON.stringify(draftVersions));
    } else {
      localStorage.removeItem("praxis_draft_versions");
    }
  }, [draftVersions, settings.isHydrated]);

  const addDraftVersion = useCallback((text: string, changeNote?: string) => {
    setDraftVersions((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].draft.trim() === text.trim()) {
        return prev;
      }
      const nextVersionNumber = prev.length + 1;
      const newVersion: DraftVersion = {
        id: `v${nextVersionNumber}-${Date.now()}`,
        versionNumber: nextVersionNumber,
        draft: text,
        label: `v${nextVersionNumber}`,
        changeNote: changeNote || (nextVersionNumber === 1 ? "Initial Draft" : "Refined Draft"),
        timestamp: Date.now(),
      };
      const next = [...prev, newVersion];
      setActiveVersionIndex(next.length - 1);
      return next;
    });
    setDraftText(text);
  }, []);

  const handleUndo = useCallback(() => {
    if (activeVersionIndex > 0 && draftVersions[activeVersionIndex - 1]) {
      const nextIdx = activeVersionIndex - 1;
      setActiveVersionIndex(nextIdx);
      setDraftText(draftVersions[nextIdx].draft);
    }
  }, [activeVersionIndex, draftVersions]);

  const handleRedo = useCallback(() => {
    if (activeVersionIndex < draftVersions.length - 1 && draftVersions[activeVersionIndex + 1]) {
      const nextIdx = activeVersionIndex + 1;
      setActiveVersionIndex(nextIdx);
      setDraftText(draftVersions[nextIdx].draft);
    }
  }, [activeVersionIndex, draftVersions]);

  const handleSelectVersion = useCallback((index: number) => {
    if (index >= 0 && index < draftVersions.length && draftVersions[index]) {
      setActiveVersionIndex(index);
      setDraftText(draftVersions[index].draft);
    }
  }, [draftVersions]);

  const handleGenerate = async (customInstruction?: string) => {
    setStatus({ gen: true, pub: false, err: null });
    setDraftText(null);
    setStreamingText("");
    setPostUrl(null);
    setReasoningSteps([]);
    setAlternativeHooks([]);

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

      let stream: ReadableStream<Uint8Array>;
      try {
        const response = await axios.post<ReadableStream<Uint8Array>>(
          `${getApiBaseUrl()}/api/draft`,
          {
            topic: customTopic || undefined,
            context: context
              ? `${context}${customInstruction ? `\n\nInstructions: ${customInstruction}` : ""}`
              : customInstruction || undefined,
            domain: domain === "auto" ? undefined : domain,
            archetype: archetype === "auto" ? undefined : archetype,
            tone: tone || undefined,
            keys: {
              provider: settings.provider,
              apiKey: settings.apiKey || undefined,
              modelName: settings.modelName || undefined,
              ollamaBaseUrl: settings.ollamaBaseUrl || undefined,
            },
          },
          {
            headers,
            adapter: "fetch",
            responseType: "stream",
          }
        );

        if (!response.data) {
          throw new Error("No response body received from stream");
        }
        stream = response.data;
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            settings.setToken(null);
            settings.setUser(null);
            throw new Error("Your session has expired. Please sign in again.");
          }
          const errorData = err.response?.data as { error?: string } | undefined;
          throw new Error(errorData?.error || err.message || `HTTP error! status: ${err.response?.status}`);
        }
        throw err;
      }

      const reader = stream.getReader();
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
          let event: StreamEvent;
          try {
            event = JSON.parse(jsonStr);
          } catch (e) {
            console.warn("Skipping unparseable SSE chunk:", jsonStr, e);
            continue;
          }

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
            if (event.alternativeHooks && event.alternativeHooks.length > 0) {
              setAlternativeHooks(event.alternativeHooks);
            }
            addDraftVersion(event.draft, event.changeNote);
          } else if (event.type === "alternative_hooks") {
            setAlternativeHooks(event.hooks);
          } else if (event.type === "error") {
            throw new Error(event.message || "Draft generation failed");
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
    setAlternativeHooks([]);
    setDraftVersions([]);
    setActiveVersionIndex(0);
    media.clearFiles();
    if (typeof window !== "undefined") {
      localStorage.removeItem("praxis_draft_text");
      localStorage.removeItem("praxis_thread_id");
      localStorage.removeItem("praxis_reasoning_steps");
      localStorage.removeItem("praxis_alternative_hooks");
      localStorage.removeItem("praxis_draft_versions");
    }
  };

  const handleNewPost = () => {
    setPostUrl(null);
    setDraftText(null);
    setStreamingText(null);
    setThreadId(null);
    setReasoningSteps([]);
    setAlternativeHooks([]);
    setDraftVersions([]);
    setActiveVersionIndex(0);
    media.clearFiles();
    setCustomTopic("");
    setContext("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("praxis_draft_text");
      localStorage.removeItem("praxis_thread_id");
      localStorage.removeItem("praxis_reasoning_steps");
      localStorage.removeItem("praxis_alternative_hooks");
      localStorage.removeItem("praxis_custom_topic");
      localStorage.removeItem("praxis_context");
      localStorage.removeItem("praxis_draft_versions");
    }
  };

  const handleApplyHook = (newHook: string) => {
    const current = draftText || streamingText;
    if (!current) return;

    const doubleBreakIdx = current.indexOf("\n\n");
    let rest = "";
    if (doubleBreakIdx !== -1) {
      rest = current.slice(doubleBreakIdx + 2);
    } else {
      const singleBreakIdx = current.indexOf("\n");
      if (singleBreakIdx !== -1) {
        rest = current.slice(singleBreakIdx + 1);
      }
    }

    const updated = rest ? `${newHook.trim()}\n\n${rest.trimStart()}` : newHook.trim();
    setDraftText(updated);
    if (streamingText !== null) {
      setStreamingText(null);
    }
    addDraftVersion(updated, "Swapped Hook via Hook Lab");
  };

  const handleDismissError = () => {
    setStatus((p) => ({ ...p, err: null }));
  };

  return {
    customTopic,
    context,
    domain,
    archetype,
    tone,
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
    isHydrating: settings.isHydrating,
    isAuthenticated: settings.isAuthenticated,
    selectedFiles: media.selectedFiles,
    isUploading: media.isUploading,
    reasoningSteps,
    alternativeHooks,
    draftVersions,
    activeVersionIndex,
    setAlternativeHooks,
    handleApplyHook,
    addDraftVersion,
    handleUndo,
    handleRedo,
    handleSelectVersion,
    setCustomTopic,
    setContext,
    setDomain,
    setArchetype,
    setTone,
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
    handleDismissError,
    handleSaveSettings: settings.handleSaveSettings,
    handleSignOut: settings.handleSignOut,
    handleDisconnectLinkedIn: settings.handleDisconnectLinkedIn,
  };
}

