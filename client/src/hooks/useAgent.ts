import { useState, useEffect } from "react";
import { fetchTopics, generateDraft, publishPost, fetchUserSettings, saveUserSettings } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import type { User } from "@supabase/supabase-js";

export function useAgent() {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [context, setContext] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [status, setStatus] = useState({ gen: false, pub: false, err: null as string | null });

  const [provider, setProvider] = useState(() => localStorage.getItem("llm_provider") || "gemini");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("llm_api_key") || "");
  const [modelName, setModelName] = useState(() => localStorage.getItem("llm_model") || "");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(() => localStorage.getItem("ollama_base_url") || "http://localhost:11434");
  const [tavilyKey, setTavilyKey] = useState(() => localStorage.getItem("tavily_key") || "");
  const [liToken, setLiToken] = useState(() => localStorage.getItem("li_token") || "");
  const [liUrn, setLiUrn] = useState(() => localStorage.getItem("li_urn") || "");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 1. Fetch default topics on mount
  useEffect(() => {
    fetchTopics().then(setTopics).catch((e) => console.error("Load topics err:", e));
  }, []);

  // 2. Subscribe to Supabase Auth State Changes
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

  // 3. Load user settings from PostgreSQL once logged in
  useEffect(() => {
    if (!token) return;

    fetchUserSettings(token)
      .then((data) => {
        if (data && data.provider) {
          setProvider(data.provider);
          setApiKey(data.apiKey || "");
          setModelName(data.modelName || "");
          setOllamaBaseUrl(data.ollamaBaseUrl || "http://localhost:11434");
          setTavilyKey(data.tavilyKey || "");
          setLiToken(data.liToken || "");
          setLiUrn(data.liUrn || "");
        }
      })
      .catch((e) => console.error("Error loading user settings from PostgreSQL:", e));
  }, [token]);

  // 4. Save settings to DB or LocalStorage when the settings modal closes
  const [prevSettingsOpen, setPrevSettingsOpen] = useState(isSettingsOpen);
  useEffect(() => {
    if (prevSettingsOpen && !isSettingsOpen) {
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
    setPrevSettingsOpen(isSettingsOpen);
  }, [isSettingsOpen, provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn, token, prevSettingsOpen]);

  // 5. Intercept LinkedIn OAuth callback tokens from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("li_token");
    const oauthUrn = params.get("li_urn");

    if (oauthToken && oauthUrn) {
      setLiToken(oauthToken);
      setLiUrn(oauthUrn);

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
      const data = await generateDraft(topic, context, dryRun, customKeys);
      setDraftText(data.draft); setThreadId(data.threadId); setActiveTab("edit");
    } catch (err: unknown) {
      setStatus(p => ({ ...p, err: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setStatus(p => ({ ...p, gen: false }));
    }
  };

  const handlePublish = async () => {
    if (!threadId || !draftText) return;
    setStatus({ gen: false, pub: true, err: null });
    try {
      const data = await publishPost(threadId, draftText, dryRun, customKeys);
      setPostUrl(data.postUrl); setDraftText(null); setThreadId(null);
    } catch (err: unknown) {
      setStatus(p => ({ ...p, err: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setStatus(p => ({ ...p, pub: false }));
    }
  };

  return {
    topics, selectedTopic, customTopic, context, dryRun, draftText, threadId, postUrl, activeTab,
    isGenerating: status.gen, isPublishing: status.pub, error: status.err,
    provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn, isSettingsOpen,
    user, token,
    setSelectedTopic, setCustomTopic, setContext, setDryRun, setDraftText, setActiveTab,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl, setTavilyKey,
    setLiToken, setLiUrn, setIsSettingsOpen,
    handleGenerate, handlePublish,
  };
}
