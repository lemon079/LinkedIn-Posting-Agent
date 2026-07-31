import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { publishPost, fetchUserSettings, saveUserSettings } from "../lib/api";
import { getApiBaseUrl } from "../lib/api/config";
import { supabase } from "../lib/supabase";
import { DEFAULT_OLLAMA_URL } from "../lib/constants";
import type { User } from "@supabase/supabase-js";
import { cleanErrorMessage } from "../lib/utils";

const getSafeLocalStorage = (key: string, fallback: string): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key) || fallback;
  }
  return fallback;
};

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
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }>>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const isUploading = uploadingCount > 0;

  const [provider, setProvider] = useState(() => getSafeLocalStorage("llm_provider", "gemini"));
  const [apiKey, setApiKey] = useState(() => getSafeLocalStorage("llm_api_key", ""));
  const [modelName, setModelName] = useState(() => getSafeLocalStorage("llm_model", ""));
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(() => getSafeLocalStorage("ollama_base_url", DEFAULT_OLLAMA_URL));

  const [liToken, setLiToken] = useState(() => getSafeLocalStorage("li_token", ""));
  const [liUrn, setLiUrn] = useState(() => getSafeLocalStorage("li_urn", ""));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const pendingOAuth = useRef<{ token: string; urn: string } | null>(null);

  // 1. Fetch user settings from Supabase
  useEffect(() => {
    const fetchSettings = async (t: string) => {
      try {
        const settings = await fetchUserSettings(t);
        setProvider(settings.provider || "gemini");
        setApiKey(settings.apiKey || "");
        setModelName(settings.modelName || "");
        setOllamaBaseUrl(settings.ollamaBaseUrl || DEFAULT_OLLAMA_URL);
        setLiToken((prev) => settings.liToken || prev);
        setLiUrn((prev) => settings.liUrn || prev);
      } catch (err) {
        console.error("Error loading user settings from PostgreSQL:", err);
      }
    };

    if (token) {
      fetchSettings(token);
    }
  }, [token]);

  // 2. Load auth session
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Flush pending LinkedIn OAuth credentials once Supabase session is ready
  useEffect(() => {
    if (!token || !pendingOAuth.current) return;

    const { token: oauthToken, urn: oauthUrn } = pendingOAuth.current;
    pendingOAuth.current = null;

    saveUserSettings({
      provider, apiKey, modelName, ollamaBaseUrl,
      liToken: oauthToken,
      liUrn: oauthUrn,
    }, token).catch((e) => console.error("Error saving OAuth settings to PostgreSQL:", e));
  }, [token, provider, apiKey, modelName, ollamaBaseUrl]);

  // 4. Save settings locally or to Postgres when settings panel is closed
  const prevSettingsOpen = useRef(isSettingsOpen);
  useEffect(() => {
    if (prevSettingsOpen.current && !isSettingsOpen) {
      if (token) {
        saveUserSettings({ provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn }, token)
          .catch((e) => console.error("Error saving user settings to PostgreSQL on close:", e));
      } else {
        localStorage.setItem("llm_provider", provider);
        localStorage.setItem("llm_api_key", apiKey);
        localStorage.setItem("llm_model", modelName);
        localStorage.setItem("ollama_base_url", ollamaBaseUrl);
        localStorage.setItem("li_token", liToken);
        localStorage.setItem("li_urn", liUrn);
      }
    }
    prevSettingsOpen.current = isSettingsOpen;
  }, [isSettingsOpen, provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, token]);

  // 5. Intercept LinkedIn OAuth callback tokens from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("li_token");
    const oauthUrn = params.get("li_urn");
    const email = params.get("email");
    const otp = params.get("otp");

    if (!oauthToken || !oauthUrn) return;

    if (email && otp && supabase) {
      supabase.auth.verifyOtp({ email, token: otp, type: "magiclink" })
        .catch((e) => console.error("Error verifying OTP from redirect:", e));
    }

    setTimeout(() => {
      setLiToken(oauthToken);
      setLiUrn(oauthUrn);
    }, 0);
    localStorage.setItem("li_token", oauthToken);
    localStorage.setItem("li_urn", oauthUrn);

    if (token) {
      saveUserSettings({
        provider, apiKey, modelName, ollamaBaseUrl,
        liToken: oauthToken,
        liUrn: oauthUrn,
      }, token).catch((e) => console.error("Error saving OAuth settings to PostgreSQL:", e));
    } else {
      pendingOAuth.current = { token: oauthToken, urn: oauthUrn };
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("li_token");
    url.searchParams.delete("li_urn");
    url.searchParams.delete("email");
    url.searchParams.delete("otp");
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }, [token, provider, apiKey, modelName, ollamaBaseUrl]);

  const customKeys = { provider, apiKey, liToken, liUrn, modelName, ollamaBaseUrl, token: token || undefined };

  const handleGenerate = async () => {
    setStatus({ gen: true, pub: false, err: null });
    setDraftText(null); setPostUrl(null); setSelectedFiles([]); setStreamingText(null);
    setReasoningSteps([]);
    try {
      const topic = customTopic;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (customKeys.provider) headers["x-llm-provider"] = customKeys.provider;
      if (customKeys.apiKey) headers["x-llm-api-key"] = customKeys.apiKey;
      if (customKeys.modelName) headers["x-llm-model"] = customKeys.modelName;
      if (customKeys.ollamaBaseUrl) headers["x-ollama-url"] = customKeys.ollamaBaseUrl;
      if (customKeys.liToken) headers["x-linkedin-token"] = customKeys.liToken;
      if (customKeys.liUrn) headers["x-linkedin-urn"] = customKeys.liUrn;
      if (customKeys.token) headers["Authorization"] = `Bearer ${customKeys.token}`;

      const response = await fetch(`${getApiBaseUrl()}/api/draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topic, context, domain: domain === "auto" ? null : domain }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not supported in this browser.");

      const decoder = new TextDecoder();
      let buffer = "";
      setActiveTab("edit");

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
              setThreadId(event.threadId);
            } else if (event.type === "node_start") {
              setReasoningSteps(prev => {
                if (prev.some(s => s.title === event.title)) return prev;
                return [...prev, { title: event.title, output: "" }];
              });
            } else if (event.type === "token" || event.type === "thinking") {
              setReasoningSteps(prev => {
                const stepIdx = prev.findIndex(s => s.title === event.node);
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
            } else if (event.type === "node_end") {
              // Node complete
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
      setStatus(p => ({ ...p, err: cleanErrorMessage(rawMsg) }));
    } finally {
      setStatus(p => ({ ...p, gen: false }));
    }
  };

  const handlePublish = async () => {
    if (!threadId || !draftText) return;
    setStatus({ gen: false, pub: true, err: null });
    try {
      const data = await publishPost(threadId, draftText, customKeys, selectedFiles.length > 0 ? selectedFiles : undefined);
      setPostUrl(data.postUrl || null); setDraftText(null); setThreadId(null); setSelectedFiles([]);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "Unknown error";
      setStatus(p => ({ ...p, err: cleanErrorMessage(rawMsg) }));
    } finally {
      setStatus(p => ({ ...p, pub: false }));
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploadingCount(prev => prev + 1);
    setStatus(p => ({ ...p, err: null }));
    try {
      if (!supabase) {
        // Fallback: local mode (base64)
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setSelectedFiles(prev => [...prev, {
              name: file.name,
              type: file.type,
              base64: reader.result as string,
            }]);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let signData;
      try {
        const signRes = await axios.get(
          `${getApiBaseUrl()}/api/media/upload/sign?filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`,
          { headers }
        );
        signData = signRes.data;
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
        const errText = axiosError.response?.data?.error || axiosError.message;
        throw new Error(`Failed to get signed URL: ${errText}`);
      }

      if (signData.localMode) {
        // Fallback: local mode (base64)
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setSelectedFiles(prev => [...prev, {
              name: file.name,
              type: file.type,
              base64: reader.result as string,
            }]);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      try {
        await axios.put(signData.uploadUrl, file, {
          headers: {
            "Content-Type": file.type
          }
        });
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: unknown }; message?: string };
        const errText = axiosError.response?.data ? String(axiosError.response.data) : axiosError.message;
        throw new Error(`Failed to upload file to storage: ${errText}`);
      }

      setSelectedFiles(prev => [...prev, {
        name: file.name,
        type: file.type,
        storagePath: signData.storagePath,
        readUrl: signData.readUrl
      }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown upload error";
      setStatus(p => ({ ...p, err: cleanErrorMessage(msg) }));
    } finally {
      setUploadingCount(prev => Math.max(0, prev - 1));
    }
  };

  return {
    customTopic, context, domain, draftText, streamingText, threadId, postUrl, activeTab,
    isGenerating: status.gen, isPublishing: status.pub, error: status.err,
    provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, isSettingsOpen,
    user, token,
    selectedFiles, isUploading,
    reasoningSteps,
    setCustomTopic, setContext, setDomain, setDraftText, setStreamingText, setActiveTab,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl,
    setLiToken, setLiUrn, setIsSettingsOpen,
    setSelectedFiles,
    setReasoningSteps,
    handleGenerate, handlePublish, handleUploadFile,
  };
}
