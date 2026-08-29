import { useState, useEffect, useRef } from "react";
import { fetchUserSettings, saveUserSettings } from "@/lib/api";
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
  const pendingOAuth = useRef<{ token: string; urn: string; expiresAt?: number } | null>(null);
  const isHydrated = useRef(false);

  // 0. Hydrate state from localStorage and intercept OAuth handoff on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    let oauthToken: string | null = null;
    let oauthUrn: string | null = null;
    let expiresAt: number | undefined = undefined;
    let email: string | null = null;
    let otp: string | null = null;
    let hashedToken: string | null = null;

    const parseHandoffRaw = (raw: string) => {
      try {
        let decoded = raw;
        try {
          decoded = atob(decoded);
        } catch {
          try {
            decoded = decodeURIComponent(decodeURIComponent(decoded));
          } catch {
            decoded = decodeURIComponent(decoded);
          }
        }
        return JSON.parse(decoded);
      } catch (e) {
        console.error("Failed to decode OAuth handoff string:", e);
        return null;
      }
    };

    // Primary: Check URL search params for auth_handoff (robust against 302 cookie drops on live URLs)
    const searchParams = new URLSearchParams(window.location.search);
    const urlHandoff = searchParams.get("auth_handoff");
    if (urlHandoff) {
      const parsed = parseHandoffRaw(urlHandoff);
      if (parsed) {
        oauthToken = parsed.token || null;
        oauthUrn = parsed.urn || null;
        expiresAt = parsed.expiresAt;
        email = parsed.email || null;
        otp = parsed.otp || null;
        hashedToken = parsed.hashedToken || null;
      }

      // Immediately sanitize the URL
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("auth_handoff");
      window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    }

    // Secondary: Check one-time handoff cookie
    if (!oauthToken) {
      const match = document.cookie.match(/(?:^|;\s*)praxis_oauth_handoff=([^;]+)/);
      if (match) {
        const parsed = parseHandoffRaw(match[1]);
        if (parsed) {
          oauthToken = parsed.token || null;
          oauthUrn = parsed.urn || null;
          expiresAt = parsed.expiresAt;
          email = parsed.email || null;
          otp = parsed.otp || null;
          hashedToken = parsed.hashedToken || null;
        }

        // Clear handoff cookie immediately
        document.cookie =
          "praxis_oauth_handoff=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }

    // Tertiary: Fallback check for legacy individual URL query parameters
    if (!oauthToken) {
      oauthToken = searchParams.get("li_token");
      oauthUrn = searchParams.get("li_urn");
      email = searchParams.get("email");
      otp = searchParams.get("otp");

      if (oauthToken) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("li_token");
        cleanUrl.searchParams.delete("li_urn");
        cleanUrl.searchParams.delete("email");
        cleanUrl.searchParams.delete("otp");
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      }
    }

    queueMicrotask(() => {
      if (oauthToken && oauthUrn) {
        setLiToken(oauthToken);
        setLiUrn(oauthUrn);
        if (expiresAt) {
          setLiTokenExpiresAt(expiresAt);
          localStorage.setItem("li_token_expires_at", String(expiresAt));
        }
        localStorage.setItem("li_token", oauthToken);
        localStorage.setItem("li_urn", oauthUrn);

        const client = supabase;
        if (client) {
          if (hashedToken) {
            client.auth
              .verifyOtp({ token_hash: hashedToken, type: "magiclink" })
              .then(({ data, error }) => {
                if (error) {
                  console.warn("verifyOtp with hashedToken encountered an error:", error.message);
                  if (email && otp) {
                    client.auth
                      .verifyOtp({ email, token: otp, type: "email" })
                      .then(({ data: fallbackData }) => {
                        if (fallbackData?.session) {
                          setUser(fallbackData.session.user);
                          setToken(fallbackData.session.access_token);
                        }
                      })
                      .catch(() => {});
                  }
                } else if (data?.session) {
                  setUser(data.session.user);
                  setToken(data.session.access_token);
                }
              })
              .catch((e) => console.error("Error verifying OTP with token hash:", e));
          } else if (email && otp) {
            client.auth
              .verifyOtp({ email, token: otp, type: "email" })
              .then(({ data }) => {
                if (data?.session) {
                  setUser(data.session.user);
                  setToken(data.session.access_token);
                }
              })
              .catch((e) => console.error("Error verifying email OTP:", e));
          }
        }
      } else {
        const savedLiToken = localStorage.getItem("li_token");
        if (savedLiToken) setLiToken(savedLiToken);

        const savedLiUrn = localStorage.getItem("li_urn");
        if (savedLiUrn) setLiUrn(savedLiUrn);

        const savedLiExpiresAt = localStorage.getItem("li_token_expires_at");
        if (savedLiExpiresAt) setLiTokenExpiresAt(Number(savedLiExpiresAt));
      }

      const savedProvider = localStorage.getItem("llm_provider");
      if (savedProvider) setProviderState(savedProvider);

      const savedApiKey = localStorage.getItem("llm_api_key");
      if (savedApiKey) setApiKey(savedApiKey);

      const savedModel = localStorage.getItem("llm_model");
      if (savedModel) setModelName(savedModel);

      const savedOllama = localStorage.getItem("ollama_base_url");
      if (savedOllama) setOllamaBaseUrl(savedOllama);

      isHydrated.current = true;
    });
  }, []);

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
        if (settings.liTokenExpiresAt) {
          setLiTokenExpiresAt(settings.liTokenExpiresAt);
          localStorage.setItem("li_token_expires_at", String(settings.liTokenExpiresAt));
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          // Token expired, clear invalid session token
          setToken(null);
          setUser(null);
        }
      }
    };

    if (token) {
      fetchSettings(token);
    }
  }, [token]);

  // 2. Load auth session and listen for refresh
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Flush pending LinkedIn OAuth credentials once Supabase session is ready
  useEffect(() => {
    if (!token || !pendingOAuth.current) return;

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
      token
    ).catch(() => {});
  }, [token, provider, apiKey, modelName, ollamaBaseUrl]);

  // 4. Save settings locally or to Postgres when settings panel is closed
  const prevSettingsOpen = useRef(isSettingsOpen);
  useEffect(() => {
    if (prevSettingsOpen.current && !isSettingsOpen) {
      if (token) {
        saveUserSettings(
          { provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt },
          token
        ).catch(() => {});
      } else {
        localStorage.setItem("llm_provider", provider);
        localStorage.setItem("llm_api_key", apiKey);
        localStorage.setItem("llm_model", modelName);
        localStorage.setItem("ollama_base_url", ollamaBaseUrl);
        localStorage.setItem("li_token", liToken);
        localStorage.setItem("li_urn", liUrn);
        if (liTokenExpiresAt) {
          localStorage.setItem("li_token_expires_at", String(liTokenExpiresAt));
        }
      }
    }
    prevSettingsOpen.current = isSettingsOpen;
  }, [isSettingsOpen, provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt, token]);

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
  };
}
