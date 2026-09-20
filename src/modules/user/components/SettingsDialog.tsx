"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMedia } from "use-media";
import { healthCheck } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import { AuthForm } from "@/modules/auth/components/AuthForm";
import type { User } from "@supabase/supabase-js";
import { cleanErrorMessage } from "@/lib/utils";
import { parseApiError, type ParsedApiError, type LlmProviderType } from "@/lib/errors";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Settings2,
  Sparkles,
  Layers,
  Link2,
  LogOut,
  ShieldCheck,
  Cloud,
  Unlink,
  Hourglass,
  ZapOff,
  Lightbulb,
  X,
} from "lucide-react";

export interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated?: boolean;
  provider: string;
  setProvider: (val: string) => void;
  apiKey: string;
  setApiKey: (val: string) => void;
  modelName: string;
  setModelName: (val: string) => void;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (val: string) => void;
  liToken: string;
  setLiToken: (val: string) => void;
  liUrn: string;
  setLiUrn: (val: string) => void;
  liTokenExpiresAt?: number;
  user: User | null;
  onSignOut?: () => void;
  onDisconnectLinkedIn?: () => void;
}

const CLOUD_MODELS: Record<string, string[]> = {
  gemini: ["gemini-3.7-flash", "gemini-3.7-pro", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-20240229"],
};

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
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
  user,
  onSignOut,
  onDisconnectLinkedIn,
}) => {
  const isDesktop = useMedia("(min-width: 768px)");
  const [currentTime] = useState(() => Date.now());
  const daysUntilRenewal = liTokenExpiresAt
    ? Math.max(0, Math.round((liTokenExpiresAt - currentTime) / (1000 * 60 * 60 * 24)))
    : 0;

  const [testState, setTestState] = useState<{
    status: "idle" | "testing" | "success" | "error";
    errorMsg?: string;
    errorInfo?: ParsedApiError;
    discoveredModels?: string[];
  }>({ status: "idle" });

  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);

  useEffect(() => {
    if (provider !== "ollama" && modelName) {
      const list = CLOUD_MODELS[provider] || [];
      setTimeout(() => {
        if (!list.includes(modelName)) {
          setIsCustomMode(true);
        } else {
          setIsCustomMode(false);
        }
      }, 0);
    } else {
      setTimeout(() => {
        setIsCustomMode(false);
      }, 0);
    }
  }, [provider, isOpen, modelName]);

  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaFetchState, setOllamaFetchState] = useState<{
    status: "idle" | "loading" | "success" | "unreachable" | "no_models";
    errorMsg?: string;
  }>({ status: "idle" });

  const fetchOllamaModels = useCallback(async () => {
    if (provider !== "ollama") return;
    setOllamaFetchState({ status: "loading" });
    try {
      const response = await healthCheck("ollama", undefined, undefined, ollamaBaseUrl);
      if (response.ok && response.models) {
        setOllamaModels(response.models);
        if (response.models.length > 0) {
          setOllamaFetchState({ status: "success" });
          if (!modelName) {
            setModelName(response.models[0]);
          }
        } else {
          setOllamaFetchState({ status: "no_models" });
        }
      } else {
        setOllamaModels([]);
        setOllamaFetchState({
          status: "unreachable",
          errorMsg: response.error || "Could not connect to Ollama. Make sure it's running on your machine.",
        });
      }
    } catch (err) {
      setOllamaModels([]);
      setOllamaFetchState({
        status: "unreachable",
        errorMsg:
          err instanceof Error
            ? err.message
            : "Could not connect to Ollama. Make sure it's running on your machine.",
      });
    }
  }, [provider, ollamaBaseUrl, modelName, setModelName]);

  useEffect(() => {
    if (!isOpen || provider !== "ollama") return;
    Promise.resolve().then(() => {
      fetchOllamaModels();
    });
  }, [isOpen, provider, ollamaBaseUrl, fetchOllamaModels]);

  const handleTestConnection = async () => {
    setTestState({ status: "testing" });

    const isMasked = !apiKey || apiKey === "••••••••••••" || apiKey.includes("•");
    let authToken: string | undefined;

    if (isMasked && provider !== "ollama") {
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          authToken = session?.access_token;
        } catch { }
      }

      if (!authToken && !user) {
        setTestState({
          status: "error",
          errorMsg: "Please enter your API key to test, or sign in to test your saved cloud key.",
          errorInfo: {
            type: "auth",
            title: "API Key Required",
            message: "Please enter your API key to test, or sign in to test your saved cloud key.",
            advice: "Enter your API key above to verify connection.",
            provider: provider as LlmProviderType,
            isAuth: true,
            isRateLimit: false,
            isQuota: false,
            isRetryable: false,
            suggestSettings: true,
            rawError: "Missing key or auth session",
          },
        });
        return;
      }
    }

    try {
      const response = await healthCheck(
        provider,
        isMasked ? undefined : apiKey,
        modelName,
        ollamaBaseUrl,
        authToken,
        isMasked
      );
      if (response.ok) {
        setTestState({
          status: "success",
          discoveredModels: response.models,
        });
        if (provider === "ollama" && response.models) {
          setOllamaModels(response.models);
        }
      } else {
        const parsed = parseApiError(response.error || "Connection test failed");
        setTestState({
          status: "error",
          errorMsg: parsed.message,
          errorInfo: parsed,
          discoveredModels: response.models,
        });
      }
    } catch (err: unknown) {
      const parsed = parseApiError(err instanceof Error ? err.message : "Connection failed");
      setTestState({
        status: "error",
        errorMsg: parsed.message,
        errorInfo: parsed,
      });
    }
  };

  const handleDisconnect = () => {
    if (onDisconnectLinkedIn) {
      onDisconnectLinkedIn();
    } else {
      setLiToken("");
      setLiUrn("");
      if (typeof window !== "undefined") {
        localStorage.removeItem("li_token");
        localStorage.removeItem("li_urn");
        localStorage.removeItem("li_token_expires_at");
      }
    }
  };

  const renderContent = (isModal: boolean) => (
    <>
      {/* Header */}
      <div className="px-4 py-3.5 sm:p-6 border-b border-border bg-surface-container-low flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0">
            <Settings2 className="size-4.5 sm:size-5" />
          </div>
          <div className="min-w-0">
            {isModal ? (
              <DialogTitle className="font-bold text-slate-900 text-sm sm:text-lg leading-tight truncate">
                Account & AI Settings
              </DialogTitle>
            ) : (
              <DrawerTitle className="font-bold text-slate-900 text-sm sm:text-lg leading-tight truncate">
                Account & AI Settings
              </DrawerTitle>
            )}
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Configure your LinkedIn integration, AI engine, and credentials.
            </p>
          </div>
        </div>

        {/* Sync Mode Badge & Close button for Drawer */}
        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <div className={isModal ? "mr-6" : ""}>
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                <Cloud className="size-3 sm:size-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Cloud Sync</span>
              </div>
            </div>
          )}

          {!isModal && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              aria-label="Close settings"
            >
              <X className="size-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Form Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-5 sm:space-y-6 custom-scrollbar text-slate-900 select-text">
        {/* Unified Section 1: LinkedIn & Account Sync */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <Link2 className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              LinkedIn & Account Connection
            </h3>
          </div>

          {liToken && liUrn ? (
            <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 p-3 sm:p-4 rounded-xl space-y-3 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-emerald-100/80 text-emerald-700 shrink-0">
                    <CheckCircle2 className="size-4 sm:size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-xs sm:text-sm text-emerald-950">LinkedIn Connected</p>
                      {user && (
                        <span className="text-[10px] sm:text-[11px] font-semibold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">
                          Cloud Synced
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-700 font-mono mt-0.5 truncate max-w-full" title={user?.email ? `${user.email} (${liUrn})` : liUrn}>
                      {user?.email ? `${user.email} (${liUrn})` : liUrn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto">
                  {user && onSignOut && (
                    <Button
                      type="button"
                      onClick={onSignOut}
                      className="bg-white hover:bg-slate-50 border border-border text-slate-700 hover:text-rose-600 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition duration-150 cursor-pointer"
                    >
                      <LogOut className="size-3.5" />
                      <span>Sign Out</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleDisconnect}
                    className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 hover:text-rose-800 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition duration-150 cursor-pointer"
                  >
                    <Unlink className="size-3.5" />
                    <span>Disconnect</span>
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs text-emerald-700 wrap-break-word">
                <span>
                  {liTokenExpiresAt
                    ? `Auto-refresh configured (${daysUntilRenewal} days until scheduled renewal)`
                    : "Active session ready for one-click publishing"}
                </span>
                {user && (
                  <span className="text-[10px] sm:text-[11px] text-emerald-800/80">AES-256 Cloud Backup Active</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-border p-3.5 sm:p-4 rounded-xl space-y-3 animate-fade-in-up">
              <div className="text-center sm:text-left">
                <p className="font-bold text-sm text-slate-800">Connect with LinkedIn</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sign in to enable 1-click publishing to your feed and automatic profile sync.
                </p>
              </div>
              <AuthForm onSuccess={() => { }} />
            </div>
          )}
        </div>

        {/* Section 2: AI Engine Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <Layers className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              AI Engine Settings
            </h3>
          </div>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>AI Provider</span>
                <span className="text-xs text-slate-450 font-normal">Required</span>
              </Label>
              <Select
                value={provider}
                onValueChange={(newProvider) => {
                  setProvider(newProvider);
                  setTestState({ status: "idle" });
                  if (newProvider === "ollama") {
                    setModelName("");
                  } else {
                    const list = CLOUD_MODELS[newProvider] || [];
                    setModelName(list[0] || "");
                  }
                  setIsCustomMode(false);
                }}
              >
                <SelectTrigger className="w-full bg-card border-border h-10 text-slate-800 text-sm rounded-xl">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="ollama">Ollama (Local Desktop)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ollama Base URL (Ollama Only) */}
            {provider === "ollama" && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs font-semibold text-slate-700">
                  Ollama Base URL
                </Label>
                <Input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={ollamaBaseUrl}
                  onChange={(e) => {
                    setOllamaBaseUrl(e.target.value);
                    setTestState({ status: "idle" });
                  }}
                />
                <p className="text-xs text-slate-500">
                  Ensure Ollama is running locally on your desktop machine.
                </p>
              </div>
            )}

            {/* API Key (Cloud Providers Only) */}
            {provider !== "ollama" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    API Key
                  </Label>
                  {apiKey && !isEditingKey && (
                    <button
                      type="button"
                      onClick={() => setIsEditingKey(true)}
                      className="text-xs text-brand-blue hover:underline font-semibold cursor-pointer"
                    >
                      Update Key
                    </button>
                  )}
                </div>

                {apiKey && !isEditingKey ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-900 truncate">API Key Configured & Encrypted</span>
                    </div>
                    <span className="font-mono text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-emerald-100 self-start sm:self-auto shrink-0">
                      ••••••••••••
                    </span>
                  </div>
                ) : (
                  <Input
                    type="password"
                    placeholder={
                      provider === "gemini"
                        ? "AIzaSy..."
                        : provider === "openai"
                          ? "sk-proj-..."
                          : "sk-ant-..."
                    }
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestState({ status: "idle" });
                    }}
                  />
                )}

                <p className="text-[11px] text-slate-500 flex items-start gap-1.5 mt-1.5 leading-relaxed bg-emerald-50/60 border border-emerald-200/60 p-2 rounded-lg">
                  <ShieldCheck className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Encrypted at Rest:</strong> Encrypted using <strong>AES-256-GCM</strong>. Secrets are never logged or exposed.
                  </span>
                </p>
              </div>
            )}

            {/* Model Selection (Ollama) */}
            {provider === "ollama" && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Model Name</span>
                  <span className="text-xs text-slate-450 font-normal">Select local model</span>
                </Label>

                {ollamaFetchState.status === "loading" && (
                  <div className="flex items-center gap-2 p-3 text-xs text-slate-500 bg-slate-50 border border-border rounded-xl">
                    <Loader2 className="size-3.5 animate-spin text-brand-blue" />
                    Fetching models from Ollama...
                  </div>
                )}

                {ollamaFetchState.status === "unreachable" && (
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl space-y-1">
                      <p className="font-semibold">⚠️ Ollama Unreachable</p>
                      <p>{cleanErrorMessage(ollamaFetchState.errorMsg || "Could not connect to Ollama.")}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. llama3, mistral"
                        value={modelName}
                        onChange={(e) => {
                          setModelName(e.target.value);
                          setTestState({ status: "idle" });
                        }}
                        className="flex-1 w-full"
                      />
                      <Button
                        type="button"
                        onClick={fetchOllamaModels}
                        className="w-full sm:w-auto px-4 bg-slate-100 hover:bg-slate-200 border border-border text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}

                {ollamaFetchState.status === "no_models" && (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800 rounded-xl space-y-1">
                      <p className="font-semibold">⚠️ No Models Found</p>
                      <p>Pull a model using <code className="bg-amber-100/60 px-1 py-0.5 rounded font-mono">ollama pull llama3</code>.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. llama3, mistral"
                        value={modelName}
                        onChange={(e) => {
                          setModelName(e.target.value);
                          setTestState({ status: "idle" });
                        }}
                        className="flex-1 w-full"
                      />
                      <Button
                        type="button"
                        onClick={fetchOllamaModels}
                        className="w-full sm:w-auto px-4 bg-slate-100 hover:bg-slate-200 border border-border text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}

                {(ollamaFetchState.status === "success" ||
                  (ollamaFetchState.status === "idle" && ollamaModels.length > 0)) && (
                    <Select
                      value={modelName}
                      onValueChange={(val) => {
                        setModelName(val);
                        setTestState({ status: "idle" });
                      }}
                    >
                      <SelectTrigger className="w-full bg-card border-border h-10 text-slate-800 text-sm rounded-xl">
                        <SelectValue placeholder="Select a model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ollamaModels.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
              </div>
            )}

            {/* Model Selection (Cloud) */}
            {provider !== "ollama" && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Model Name</span>
                  <span className="text-xs text-slate-450 font-normal">
                    {provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI GPT" : "Anthropic Claude"}
                  </span>
                </Label>
                <Select
                  value={isCustomMode ? "custom" : (modelName || (CLOUD_MODELS[provider] || [])[0] || "")}
                  onValueChange={(val) => {
                    if (val === "custom") {
                      setIsCustomMode(true);
                      setModelName("");
                    } else {
                      setIsCustomMode(false);
                      setModelName(val);
                    }
                    setTestState({ status: "idle" });
                  }}
                >
                  <SelectTrigger className="w-full bg-card border-border h-10 text-slate-800 text-sm rounded-xl">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set([
                        ...(CLOUD_MODELS[provider] || []),
                        ...(testState.discoveredModels || []),
                      ])
                    ).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Model Name...</SelectItem>
                  </SelectContent>
                </Select>

                {isCustomMode && (
                  <div className="space-y-1 mt-2">
                    <Input
                      type="text"
                      placeholder="Enter custom model name (e.g. gpt-4o, gemini-2.5-pro)..."
                      value={modelName}
                      onChange={(e) => {
                        setModelName(e.target.value.trim());
                        setTestState({ status: "idle" });
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Test Connection Button */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.status === "testing"}
                className="w-full bg-surface-container hover:bg-surface-container-high border border-border hover:border-outline text-foreground rounded-xl py-2.5 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
              >
                {testState.status === "testing" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-brand-blue" />
                    Testing Endpoint Connection...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-brand-blue" />
                    Test Connection
                  </>
                )}
              </Button>

              {testState.status === "success" && (
                <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-fade-in">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <span className="font-semibold block">Connection Verified</span>
                    <span className="text-emerald-600 text-xs">Successfully reached the LLM provider interface.</span>
                  </div>
                </div>
              )}

              {testState.status === "error" && (
                <div
                  className={
                    testState.errorInfo?.isRateLimit || testState.errorInfo?.isQuota
                      ? "mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-100 animate-fade-in wrap-anywhere"
                      : "mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-fade-in wrap-break-word"
                  }
                >
                  {testState.errorInfo?.isRateLimit || testState.errorInfo?.isQuota ? (
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-100">
                        {testState.errorInfo.isQuota ? (
                          <ZapOff className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Hourglass className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        )}
                        <span className="truncate">{testState.errorInfo.title}</span>
                      </div>
                      <p className="text-amber-800 dark:text-amber-200 text-xs wrap-break-word">{testState.errorMsg}</p>
                      {testState.errorInfo.advice && (
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 p-1.5 rounded-md wrap-anywhere">
                          <Lightbulb className="size-3 shrink-0 mt-0.5" />
                          <span>{testState.errorInfo.advice}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <XCircle className="size-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold block truncate">{testState.errorInfo?.title || "Connection Failed"}</span>
                        <span className="text-rose-600 dark:text-rose-300 text-xs line-clamp-3 font-medium wrap-break-word">
                          {testState.errorMsg}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3.5 sm:p-5 border-t border-border bg-surface-container-low/50 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <p className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left truncate sm:whitespace-normal">
          {user
            ? "Settings synchronized to your cloud profile."
            : "Sign in to synchronize settings to your cloud profile."}
        </p>
        <Button
          onClick={onClose}
          className="w-full sm:w-auto bg-brand-blue hover:bg-brand-blue-hover active:bg-brand-blue-hover text-white font-semibold px-6 py-2.5 rounded-xl transition duration-200 shadow-md cursor-pointer text-xs sm:text-sm shrink-0"
        >
          Apply Settings
        </Button>
      </div>
    </>
  );

  // Guest mode guard: If explicitly not authenticated, prevent the dialog/drawer from opening
  const isEffectivelyOpen = Boolean(isOpen && (isAuthenticated !== false));

  if (isDesktop) {
    return (
      <Dialog open={isEffectivelyOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={true}
          className="w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[85dvh] p-0 flex flex-col overflow-hidden bg-card border border-border shadow-2xl rounded-2xl text-foreground focus:outline-none"
        >
          {renderContent(true)}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isEffectivelyOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="w-full h-[90dvh] max-h-[92dvh] mt-0 bg-card border-t border-border flex flex-col shadow-2xl text-foreground overflow-hidden rounded-t-2xl focus:outline-none">
        {renderContent(false)}
      </DrawerContent>
    </Drawer>
  );
};
