import { useState, useEffect, useRef } from "react";
import { fetchTopics, generateDraft, publishPost, fetchUserSettings, saveUserSettings } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { cleanErrorMessage } from "../lib/utils";

const getSafeLocalStorage = (key: string, fallback: string): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key) || fallback;
  }
  return fallback;
};

export function useAgent() {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [context, setContext] = useState("");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [status, setStatus] = useState({ gen: false, pub: false, err: null as string | null });

  const [provider, setProvider] = useState(() => getSafeLocalStorage("llm_provider", "gemini"));
  const [apiKey, setApiKey] = useState(() => getSafeLocalStorage("llm_api_key", ""));
  const [modelName, setModelName] = useState(() => getSafeLocalStorage("llm_model", ""));
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(() => getSafeLocalStorage("ollama_base_url", "http://localhost:11434"));
  const [tavilyKey, setTavilyKey] = useState(() => getSafeLocalStorage("tavily_key", ""));

  const [liToken, setLiToken] = useState(() => getSafeLocalStorage("li_token", ""));
  const [liUrn, setLiUrn] = useState(() => getSafeLocalStorage("li_urn", ""));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 1. Fetch user settings from Supabase
  useEffect(() => {
    const fetchSettings = async (t: string) => {
      try {
        const settings = await fetchUserSettings(t);
        setProvider(settings.llm_provider || "gemini");
        setApiKey(settings.encrypted_api_key || "");
        setModelName(settings.llm_model || "");
        setOllamaBaseUrl(settings.ollama_base_url || "http://localhost:11434");
        setTavilyKey(settings.encrypted_tavily_key || "");
        setLiToken(settings.encrypted_linkedin_token || "");
        setLiUrn(settings.linkedin_urn || "");
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

  // 3. Load public topics
  useEffect(() => {
    fetchTopics()
      .then((t) => setTopics(t))
      .catch((e) => console.error("Error loading topics:", e));
  }, []);

  // 4. Save settings locally or to Postgres when settings panel is closed
  const prevSettingsOpen = useRef(isSettingsOpen);
  useEffect(() => {
    if (prevSettingsOpen.current && !isSettingsOpen) {
      if (token) {
        saveUserSettings({ provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn }, token)
          .catch((e) => console.error("Error saving user settings to PostgreSQL on close:", e));
      } else {
        localStorage.setItem("llm_provider", provider);
        localStorage.setItem("llm_api_key", apiKey);
        localStorage.setItem("llm_model", modelName);
        localStorage.setItem("ollama_base_url", ollamaBaseUrl);
        localStorage.setItem("tavily_key", tavilyKey);
        localStorage.setItem("li_token", liToken);
        localStorage.setItem("li_urn", liUrn);
      }
    }
    prevSettingsOpen.current = isSettingsOpen;
  }, [isSettingsOpen, provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn, token]);

  // 5. Intercept LinkedIn OAuth callback tokens from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("li_token");
    const oauthUrn = params.get("li_urn");

    if (oauthToken && oauthUrn) {
      setTimeout(() => {
        setLiToken(oauthToken);
        setLiUrn(oauthUrn);
      }, 0);

      if (token) {
        saveUserSettings({
          provider, apiKey, modelName, ollamaBaseUrl, tavilyKey,
          liToken: oauthToken,
          liUrn: oauthUrn
        }, token).catch((e) => console.error("Error saving OAuth settings to PostgreSQL:", e));
      } else {
        localStorage.setItem("li_token", oauthToken);
        localStorage.setItem("li_urn", oauthUrn);
      }

      // Clear query params from URL bar
      const url = new URL(window.location.href);
      url.searchParams.delete("li_token");
      url.searchParams.delete("li_urn");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, [token, provider, apiKey, modelName, ollamaBaseUrl, tavilyKey]);

  const customKeys = { provider, apiKey, liToken, liUrn, modelName, ollamaBaseUrl, tavilyKey, token: token || undefined };

  const handleGenerate = async () => {
    setStatus({ gen: true, pub: false, err: null });
    setDraftText(null); setPostUrl(null);
    try {
      const topic = selectedTopic || customTopic;
      const data = await generateDraft(topic, context, customKeys);
      setDraftText(data.draft); setThreadId(data.threadId); setActiveTab("edit");
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
      const data = await publishPost(threadId, draftText, customKeys);
      setPostUrl(data.postUrl); setDraftText(null); setThreadId(null);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "Unknown error";
      setStatus(p => ({ ...p, err: cleanErrorMessage(rawMsg) }));
    } finally {
      setStatus(p => ({ ...p, pub: false }));
    }
  };

  return {
    topics, selectedTopic, customTopic, context, draftText, threadId, postUrl, activeTab,
    isGenerating: status.gen, isPublishing: status.pub, error: status.err,
    provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn, isSettingsOpen,
    user, token,
    setSelectedTopic, setCustomTopic, setContext, setDraftText, setActiveTab,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl, setTavilyKey,
    setLiToken, setLiUrn, setIsSettingsOpen,
    handleGenerate, handlePublish,
  };
}
