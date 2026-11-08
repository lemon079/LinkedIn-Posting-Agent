import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchUserSettings,
  saveUserSettings,
  disconnectLinkedIn,
  fetchAuthSession,
  clearAuthSession,
} from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_OLLAMA_URL } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";

export function useAgentSettings() {
  const [provider, setProviderState] = useState("gemini");
  const setProvider = (val: string) => {
    setProviderState(val);
  };
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(DEFAULT_OLLAMA_URL);

  const [liToken, setLiToken] = useState("");
  const [liUrn, setLiUrn] = useState("");
  const [liTokenExpiresAt, setLiTokenExpiresAt] = useState<number | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const pendingOAuth = useRef<{ token: string; urn: string; expiresAt?: number } | null>(null);
  const isHydrated = useRef(false);

  // 0. Primary Hydration: Check HTTP-only server session and intercept legacy OAuth handoffs
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    async function initSession() {
      // 1. Check server-side HTTP-only session cookie first
      try {
        const sessionData = await fetchAuthSession();
        if (!isMounted) return;

        if (sessionData.authenticated && sessionData.user) {
          setUser(sessionData.user as User);
          if (sessionData.token) {
            setToken(sessionData.token);
            if (supabase) {
              supabase.auth
                .setSession({ access_token: sessionData.token, refresh_token: "" })
                .catch(() => {});
            }
          }

          if (sessionData.settings) {
            if (sessionData.settings.provider) setProviderState(sessionData.settings.provider);
            if (sessionData.settings.modelName) setModelName(sessionData.settings.modelName);
            if (sessionData.settings.ollamaBaseUrl) setOllamaBaseUrl(sessionData.settings.ollamaBaseUrl);
            if (sessionData.settings.apiKey) setApiKey(sessionData.settings.apiKey);
            if (sessionData.settings.liUrn) setLiUrn(sessionData.settings.liUrn);
            if (sessionData.settings.liTokenExpiresAt) {
              setLiTokenExpiresAt(sessionData.settings.liTokenExpiresAt);
            }
            if (sessionData.settings.liToken || sessionData.linkedInConnected) {
              setLiToken(sessionData.settings.liToken || "••••••••••••");
            }
          } else if (sessionData.linkedInConnected) {
            setLiToken("••••••••••••");
          }

          isHydrated.current = true;
          setIsHydrating(false);
          return;
        }
      } catch (sessionErr) {
        if (process.env.NODE_ENV !== "test") {
          console.warn("Could not retrieve server auth session:", sessionErr);
        }
      }

      if (!isMounted) return;

      // 2. Check legacy URL search params or fallback handoffs
      const searchParams = new URLSearchParams(window.location.search);
      const urlHandoff = searchParams.get("auth_handoff");
      let legacyToken = searchParams.get("li_token");
      let legacyUrn = searchParams.get("li_urn");

      if (urlHandoff) {
        try {
          const parsed = JSON.parse(decodeURIComponent(urlHandoff));
          if (parsed.token && parsed.urn) {
            legacyToken = parsed.token;
            legacyUrn = parsed.urn;
          }
        } catch {}
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("auth_handoff");
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      } else if (legacyToken) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("li_token");
        cleanUrl.searchParams.delete("li_urn");
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      }

      if (legacyToken && legacyUrn) {
        setLiToken(legacyToken);
        setLiUrn(legacyUrn);
      }

      // 3. Fallback: Check client-side Supabase getSession
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setUser(data.session.user);
            setToken(data.session.access_token);
          }
        } catch {}
      }

      // Load unauthenticated client preferences from localStorage
      const savedProvider = localStorage.getItem("llm_provider");
      if (savedProvider) setProviderState(savedProvider);

      const savedModel = localStorage.getItem("llm_model");
      if (savedModel) setModelName(savedModel);

      const savedOllama = localStorage.getItem("ollama_base_url");
      if (savedOllama) setOllamaBaseUrl(savedOllama);

      isHydrated.current = true;
      setIsHydrating(false);
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Fetch user settings from Supabase when token is explicitly refreshed
  useEffect(() => {
    const fetchSettings = async (t: string) => {
      try {
        const settings = await fetchUserSettings(t);

        if (settings.provider) setProvider(settings.provider);
        if (settings.apiKey) setApiKey(settings.apiKey);
        if (settings.modelName) setModelName(settings.modelName);
        if (settings.ollamaBaseUrl) setOllamaBaseUrl(settings.ollamaBaseUrl);

        if (settings.liToken) setLiToken(settings.liToken);
        if (settings.liUrn) setLiUrn(settings.liUrn);
        if (settings.liTokenExpiresAt) {
          setLiTokenExpiresAt(settings.liTokenExpiresAt);
        }

        // Clean up sensitive plaintext credentials from localStorage in Cloud Mode
        if (typeof window !== "undefined") {
          localStorage.removeItem("li_token");
          localStorage.removeItem("li_urn");
          localStorage.removeItem("li_token_expires_at");
          localStorage.removeItem("llm_api_key");
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          setToken(null);
          setUser(null);
        }
      }
    };

    if (token) {
      fetchSettings(token);
    }
  }, [token]);

  // 2. Listen for client-side Supabase auth state changes
  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setToken(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Flush pending LinkedIn OAuth credentials once session is ready
  useEffect(() => {
    if ((!token && !user) || !pendingOAuth.current) return;

    const { token: oauthToken, urn: oauthUrn, expiresAt } = pendingOAuth.current;
    pendingOAuth.current = null;

    saveUserSettings(
      {
        provider,
        apiKey,
        modelName,
        ollamaBaseUrl,
        liToken: oauthToken,
        liUrn: oauthUrn,
        liTokenExpiresAt: expiresAt,
      },
      token || undefined
    ).catch(() => {});
  }, [token, user, provider, apiKey, modelName, ollamaBaseUrl]);

  // 4. Dedicated async save settings function with tactile feedback delay
  const isExplicitSavingRef = useRef(false);
  const handleSaveSettings = useCallback(async () => {
    isExplicitSavingRef.current = true;
    const minDelay = new Promise((resolve) => setTimeout(resolve, 500));

    try {
      if (token || user) {
        await Promise.all([
          saveUserSettings(
            { provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt },
            token || undefined
          ),
          minDelay,
        ]);
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem("llm_provider", provider);
          localStorage.setItem("llm_model", modelName);
          localStorage.setItem("ollama_base_url", ollamaBaseUrl);
          if (apiKey) localStorage.setItem("llm_api_key", apiKey);
          if (liUrn) localStorage.setItem("li_urn", liUrn);
          if (liTokenExpiresAt) localStorage.setItem("li_token_expires_at", String(liTokenExpiresAt));
        }
        await minDelay;
      }
    } finally {
      setTimeout(() => {
        isExplicitSavingRef.current = false;
      }, 600);
    }
  }, [token, user, provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt]);

  // Fallback: Save settings locally or to Postgres when settings panel is dismissed without clicking Apply
  const prevSettingsOpen = useRef(isSettingsOpen);
  useEffect(() => {
    if (prevSettingsOpen.current && !isSettingsOpen) {
      if (!isExplicitSavingRef.current) {
        if (token || user) {
          saveUserSettings(
            { provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt },
            token || undefined
          ).catch(() => {});
        } else {
          localStorage.setItem("llm_provider", provider);
          localStorage.setItem("llm_model", modelName);
          localStorage.setItem("ollama_base_url", ollamaBaseUrl);
        }
      }
    }
    prevSettingsOpen.current = isSettingsOpen;
  }, [isSettingsOpen, provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt, token, user]);

  // 5. Atomic Purge / Teardown on Sign-Out
  const handleSignOut = useCallback(async () => {
    setUser(null);
    setToken(null);
    setLiToken("");
    setLiUrn("");
    setLiTokenExpiresAt(undefined);
    setApiKey("");

    if (typeof window !== "undefined") {
      localStorage.removeItem("li_token");
      localStorage.removeItem("li_urn");
      localStorage.removeItem("li_token_expires_at");
      localStorage.removeItem("llm_api_key");
      document.cookie =
        "praxis_oauth_handoff=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }

    try {
      await clearAuthSession();
    } catch {}

    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
  }, []);

  // 6. Dedicated LinkedIn Disconnect Action
  const handleDisconnectLinkedIn = useCallback(async () => {
    try {
      await disconnectLinkedIn(token || undefined);
    } catch (e) {
      console.error("Failed to disconnect LinkedIn from cloud account:", e);
    }

    setLiToken("");
    setLiUrn("");
    setLiTokenExpiresAt(undefined);

    if (typeof window !== "undefined") {
      localStorage.removeItem("li_token");
      localStorage.removeItem("li_urn");
      localStorage.removeItem("li_token_expires_at");
    }
  }, [token]);

  return {
    provider,
    setProvider,
    apiKey,
    setApiKey,
    modelName,
    setModelName,
    ollamaBaseUrl,
    setOllamaBaseUrl,
    liToken,
    setLiToken,
    liUrn,
    setLiUrn,
    liTokenExpiresAt,
    isSettingsOpen,
    setIsSettingsOpen,
    user,
    setUser,
    token,
    setToken,
    isHydrated,
    isHydrating,
    isAuthenticated: Boolean(user || liToken || token),
    handleSaveSettings,
    handleSignOut,
    handleDisconnectLinkedIn,
  };
}
