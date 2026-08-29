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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useMedia } from "use-media";
import { healthCheck } from "@/lib/api";
import { AuthForm } from "@/modules/auth/components/AuthForm";
import type { User } from "@supabase/supabase-js";
import { cleanErrorMessage } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Settings2,
  Sparkles,
  Layers,
  Link2,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Cloud,
  HardDrive,
  Unlink,
} from "lucide-react";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
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
  gemini: ["gemini-3.7-flash", "gemini-3.7-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-20240229"],
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
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
  const [currentTime] = useState(() => Date.now());
  const daysUntilRenewal = liTokenExpiresAt
    ? Math.max(0, Math.round((liTokenExpiresAt - currentTime) / (1000 * 60 * 60 * 24)))
    : 0;

  const [testState, setTestState] = useState<{
    status: "idle" | "testing" | "success" | "error";
    errorMsg?: string;
    discoveredModels?: string[];
  }>({ status: "idle" });

  const isWide = useMedia("(min-width: 768px)");
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
    try {
      const response = await healthCheck(provider, apiKey, modelName, ollamaBaseUrl);
      if (response.ok) {
        setTestState({
          status: "success",
          discoveredModels: response.models,
        });
        if (provider === "ollama" && response.models) {
          setOllamaModels(response.models);
        }
      } else {
        setTestState({
          status: "error",
          errorMsg: cleanErrorMessage(response.error || "Connection test failed"),
          discoveredModels: response.models,
        });
      }
    } catch (err: unknown) {
      setTestState({
        status: "error",
        errorMsg: cleanErrorMessage(err instanceof Error ? err.message : "Connection failed"),
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

  const renderPanelBody = () => (
    <>
      {/* Header */}
      <div className="p-6 border-b border-border bg-surface-container-low flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue">
            <Settings2 className="size-5" />
          </div>
          <div>
            {isWide ? (
              <SheetTitle className="font-bold text-slate-900 text-lg leading-tight">
                Account & API Settings
              </SheetTitle>
            ) : (
              <DrawerTitle className="font-bold text-slate-900 text-lg leading-tight">
                Account & API Settings
              </DrawerTitle>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Configure your account sync, AI engine, and credentials.
            </p>
          </div>
        </div>

        {/* Sync Mode Badge */}
        {user ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <Cloud className="size-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Cloud Sync</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
            <HardDrive className="size-3.5 text-slate-500" />
            <span className="hidden sm:inline">Local Mode</span>
          </div>
        )}
      </div>

      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-900 select-text">
        {/* Section 1: Account Cloud Sync */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <UserIcon className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Account Sync
            </h3>
          </div>

          {user ? (
            <div className="bg-surface-container-low border border-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-500">Signed In As</p>
                  <p className="text-sm font-bold text-slate-800">{user.email}</p>
                </div>
                <Button
                  onClick={onSignOut}
                  className="bg-white hover:bg-slate-50 border border-border text-slate-700 hover:text-rose-600 hover:border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition duration-150 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                ✓ All configuration parameters are encrypted with AES-256-GCM and synchronized securely to your cloud profile.
              </p>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-border p-4 rounded-xl space-y-4">
              <AuthForm onSuccess={() => {}} />
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Operating in <strong>Local Storage Mode</strong>. Sign in with LinkedIn above to enable automatic cloud backup and cross-device sync.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: LinkedIn Connection Status */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <Link2 className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              LinkedIn Integration
            </h3>
          </div>

          {liToken && liUrn ? (
            <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-800 p-4 rounded-xl space-y-3 animate-fade-in-up">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-emerald-950">LinkedIn Connected</p>
                    <p className="text-xs text-emerald-700 font-mono mt-0.5 truncate max-w-[200px] sm:max-w-[280px]">
                      {liUrn}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleDisconnect}
                  className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 hover:text-rose-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition duration-150 cursor-pointer"
                >
                  <Unlink className="size-3.5" />
                  <span>Disconnect</span>
                </Button>
              </div>
              <p className="text-xs text-emerald-700 font-normal leading-relaxed">
                {liTokenExpiresAt
                  ? `Active session • Auto-refresh configured (${daysUntilRenewal} days until scheduled renewal).`
                  : "Active session connected and ready for one-click publishing."}
              </p>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-border p-4 rounded-xl space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <XCircle className="size-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-700">LinkedIn Not Connected</p>
                    <p className="text-xs text-slate-500 mt-0.5">Required to publish generated drafts to your feed.</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    window.location.href = "/api/auth/linkedin?state=login";
                  }}
                  className="bg-brand-blue hover:bg-brand-blue-hover text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition duration-150 cursor-pointer"
                >
                  <Link2 className="size-3.5" />
                  <span>Connect</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: AI Engine Settings */}
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
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-900">API Key Configured & Encrypted</span>
                    </div>
                    <span className="font-mono text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-emerald-100">
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
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. llama3, mistral"
                        value={modelName}
                        onChange={(e) => {
                          setModelName(e.target.value);
                          setTestState({ status: "idle" });
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={fetchOllamaModels}
                        className="px-3.5 bg-slate-100 hover:bg-slate-200 border border-border text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
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
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. llama3, mistral"
                        value={modelName}
                        onChange={(e) => {
                          setModelName(e.target.value);
                          setTestState({ status: "idle" });
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={fetchOllamaModels}
                        className="px-3.5 bg-slate-100 hover:bg-slate-200 border border-border text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
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
                    {(CLOUD_MODELS[provider] || []).map((m) => (
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
                      placeholder="Enter custom model name (e.g. gpt-4-32k)..."
                      value={modelName}
                      onChange={(e) => {
                        setModelName(e.target.value);
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
                <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-fade-in">
                  <XCircle className="size-4 mt-0.5 shrink-0 text-rose-600" />
                  <div>
                    <span className="font-semibold block">Connection Failed</span>
                    <span className="text-rose-550 text-xs line-clamp-3 font-medium">{testState.errorMsg}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-surface-container-low/50 flex items-center justify-between">
        <p className="text-xs text-slate-500 max-w-[50%]">
          {user
            ? "Settings synchronized to your encrypted cloud profile."
            : "Settings stored locally in this browser."}
        </p>
        <Button
          onClick={onClose}
          className="bg-brand-blue hover:bg-brand-blue-hover active:bg-brand-blue-hover text-white font-semibold px-5 py-3 rounded-xl transition duration-200 shadow-lg cursor-pointer text-sm"
        >
          Apply Settings
        </Button>
      </div>
    </>
  );

  if (isWide) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full max-w-lg bg-card border-l border-border h-full p-0 flex flex-col justify-between shadow-level-2 text-foreground overflow-hidden"
        >
          {renderPanelBody()}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        className="w-full max-h-[92vh] bg-card border-t border-border flex flex-col justify-between shadow-level-2 text-foreground overflow-hidden rounded-t-2xl"
      >
        {renderPanelBody()}
      </DrawerContent>
    </Drawer>
  );
};
