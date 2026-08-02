"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
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
import { AuthForm } from "./AuthForm";
import { supabase } from "../lib/supabase";
import { healthCheck } from "../lib/api";
import type { User } from "@supabase/supabase-js";
import { cleanErrorMessage } from "../lib/utils";
import { useIsDesktop } from "../lib/desktop";
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
  X,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const CLOUD_MODELS: Record<string, string[]> = {
  gemini: [
    // Latest Gemini API model IDs (Google)
    "gemini-3.5-flash",          // newest general-purpose flash
    "gemini-3.1-pro-preview",    // recommended replacement for gemini-2.5-pro
    "gemini-3.1-flash-lite",     // replacement for gemini-2.5-flash-lite
    "gemini-3.1-flash-image"     // image-capable flash variant
  ],

  openai: [
    // GPT‑5.6 family (OpenAI API, July 2026)
    "gpt-5.6-sol",   // flagship / deepest reasoning
    "gpt-5.6-terra", // balanced cost/performance
    "gpt-5.6-luna",  // fast & cheapest
    "gpt-5.6"        // alias that routes to Sol
  ],

  anthropic: [
    // Latest Claude models (Anthropic API, mid‑2026)
    "claude-fable-5",        // newest Mythos‑class flagship
    "claude-opus-4.8",       // latest Opus
    "claude-sonnet-4.6",     // latest Sonnet
    "claude-haiku-4.5"       // latest Haiku
  ]
};

interface AppSidebarProps {
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
  user: User | null;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
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
  user,
}) => {
  const { setOpen } = useSidebar();
  const isDesktop = useIsDesktop();

  const [testState, setTestState] = useState<{
    status: "idle" | "testing" | "success" | "error";
    errorMsg?: string;
    discoveredModels?: string[];
  }>({ status: "idle" });

  const [isCustomMode, setIsCustomMode] = useState(false);

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
  }, [provider, modelName]);

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
          errorMsg: response.error || "Could not connect to Ollama.",
        });
      }
    } catch (err) {
      setOllamaModels([]);
      setOllamaFetchState({
        status: "unreachable",
        errorMsg: err instanceof Error ? err.message : "Could not connect to Ollama.",
      });
    }
  }, [provider, ollamaBaseUrl, modelName, setModelName]);

  useEffect(() => {
    if (provider !== "ollama") return;
    Promise.resolve().then(() => {
      fetchOllamaModels();
    });
  }, [provider, ollamaBaseUrl, fetchOllamaModels]);

  const handleTestConnection = async () => {
    setTestState({ status: "testing" });
    try {
      const response = await healthCheck(provider, apiKey, modelName, ollamaBaseUrl);
      if (response.ok) {
        setTestState({ status: "success", discoveredModels: response.models });
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

  return (
    <Sidebar side="right" collapsible="offcanvas">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue">
              <Settings2 className="size-4" />
            </div>
            <div>
              <h2 className="font-bold text-sidebar-foreground text-base leading-tight">
                Account & API Settings
              </h2>
              <p className="text-xs text-sidebar-foreground/50 mt-0.5">
                Configure your AI engine and credentials.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </SidebarHeader>

      {/* Scrollable Content */}
      <SidebarContent className="px-5 py-5 space-y-6 overflow-y-auto">
        {/* Account Sync */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-sidebar-border">
            <UserIcon className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/60">
              Account Sync
            </h3>
          </div>
          {user ? (
            <div className="bg-sidebar-accent border border-sidebar-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-sidebar-foreground/60">Signed In As</p>
                  <p className="text-sm font-bold text-sidebar-foreground">{user.email}</p>
                </div>
                <Button
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                  }}
                  className="bg-card hover:bg-sidebar-accent border border-sidebar-border text-sidebar-foreground hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition duration-150 cursor-pointer h-auto"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
              <p className="text-xs text-sidebar-foreground/50 leading-relaxed">
                ✓ Settings synchronized. Your configurations are saved securely.
              </p>
            </div>
          ) : liToken ? (
            <div className="bg-sidebar-accent border border-sidebar-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-sidebar-foreground/60">LinkedIn Account</p>
                  <p className="text-sm font-bold text-sidebar-foreground">Connected (Local Mode)</p>
                </div>
                <Button
                  onClick={() => {
                    setLiToken("");
                    setLiUrn("");
                    localStorage.removeItem("li_token");
                    localStorage.removeItem("li_urn");
                  }}
                  className="bg-card hover:bg-sidebar-accent border border-sidebar-border text-sidebar-foreground hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition duration-150 cursor-pointer h-auto"
                >
                  <LogOut className="size-3.5" />
                  Disconnect
                </Button>
              </div>
              <p className="text-xs text-sidebar-foreground/50 leading-relaxed">
                Settings saved locally. Configure Supabase for cloud sync.
              </p>
            </div>
          ) : (
            <div className="bg-sidebar-accent border border-sidebar-border p-4 rounded-xl space-y-4">
              <AuthForm onSuccess={() => { }} />
              <div className="border-t border-sidebar-border pt-3">
                <p className="text-xs text-sidebar-foreground/50 leading-relaxed font-medium">
                  Without signing in, settings will only be saved locally.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI Engine */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-sidebar-border">
            <Layers className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/60">
              AI Engine Settings
            </h3>
          </div>

          <div className="space-y-4">
            {/* Provider */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sidebar-foreground/80 flex items-center justify-between">
                <span>AI Provider</span>
                <span className="text-xs text-sidebar-foreground/40 font-normal">Required</span>
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
                <SelectTrigger className="w-full bg-card border-sidebar-border h-10 text-sidebar-foreground text-sm rounded-xl">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="ollama" disabled={!isDesktop}>
                    Ollama {isDesktop ? "(Local)" : "(Desktop App Only)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ollama Base URL */}
            {provider === "ollama" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sidebar-foreground/80">
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
                <p className="text-xs text-sidebar-foreground/50">
                  Verify Ollama is running locally or on your private network.
                </p>
              </div>
            )}

            {/* API Key */}
            {provider !== "ollama" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sidebar-foreground/80">API Key</Label>
                <Input
                  type="password"
                  placeholder={
                    provider === "gemini" ? "AIzaSy..." : provider === "openai" ? "sk-proj-..." : "sk-ant-..."
                  }
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestState({ status: "idle" });
                  }}
                />
              </div>
            )}

            {/* Ollama Model */}
            {provider === "ollama" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sidebar-foreground/80 flex items-center justify-between">
                  <span>Model Name</span>
                  <span className="text-xs text-sidebar-foreground/40 font-normal">Select local model</span>
                </Label>
                {ollamaFetchState.status === "loading" && (
                  <div className="flex items-center gap-2 p-3 text-xs text-sidebar-foreground/60 bg-sidebar-accent border border-sidebar-border rounded-xl">
                    <Loader2 className="size-3.5 animate-spin text-brand-blue" />
                    Fetching local models from Ollama...
                  </div>
                )}
                {ollamaFetchState.status === "unreachable" && (
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded-xl space-y-1">
                      <p className="font-semibold">⚠️ Connection Error</p>
                      <p>{cleanErrorMessage(ollamaFetchState.errorMsg || "Could not connect to Ollama.")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. llama3, mistral"
                        value={modelName}
                        onChange={(e) => { setModelName(e.target.value); setTestState({ status: "idle" }); }}
                        className="flex-1"
                      />
                      <Button type="button" onClick={fetchOllamaModels} className="px-3.5 bg-sidebar-accent hover:bg-sidebar-border border border-sidebar-border text-sidebar-foreground rounded-xl text-xs font-semibold cursor-pointer h-auto">
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
                {(ollamaFetchState.status === "success" || (ollamaFetchState.status === "idle" && ollamaModels.length > 0)) && (
                  <Select
                    value={modelName}
                    onValueChange={(val) => { setModelName(val); setTestState({ status: "idle" }); }}
                  >
                    <SelectTrigger className="w-full bg-card border-sidebar-border h-10 text-sidebar-foreground text-sm rounded-xl">
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

            {/* Cloud Model */}
            {provider !== "ollama" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sidebar-foreground/80 flex items-center justify-between">
                  <span>Model Name</span>
                  <span className="text-xs text-sidebar-foreground/40 font-normal">
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
                  <SelectTrigger className="w-full bg-card border-sidebar-border h-10 text-sidebar-foreground text-sm rounded-xl">
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
                  <Input
                    type="text"
                    placeholder="Enter custom model name..."
                    value={modelName}
                    onChange={(e) => { setModelName(e.target.value); setTestState({ status: "idle" }); }}
                  />
                )}
              </div>
            )}

            {/* Test Connection */}
            <div className="pt-1">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.status === "testing"}
                className="w-full bg-sidebar-accent hover:bg-sidebar-border border border-sidebar-border text-sidebar-foreground rounded-xl py-2.5 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 h-auto"
              >
                {testState.status === "testing" ? (
                  <><Loader2 className="size-3.5 animate-spin text-brand-blue" />Testing Connection...</>
                ) : (
                  <><Sparkles className="size-3.5 text-brand-blue" />Test Connection</>
                )}
              </Button>
              {testState.status === "success" && (
                <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                  <div><span className="font-semibold block">Connection Verified</span><span className="text-emerald-600">Successfully reached the LLM provider.</span></div>
                </div>
              )}
              {testState.status === "error" && (
                <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <XCircle className="size-4 mt-0.5 shrink-0 text-red-600" />
                  <div><span className="font-semibold block">Connection Failed</span><span className="text-red-600 line-clamp-3 font-medium">{testState.errorMsg}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* LinkedIn */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-sidebar-border">
            <Link2 className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/60">
              LinkedIn Account
            </h3>
          </div>
          {liToken && liUrn ? (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-emerald-900">LinkedIn Connected</p>
                <p className="text-xs text-sidebar-foreground/50 font-normal mt-0.5 font-mono truncate">{liUrn}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-sidebar-accent border border-sidebar-border text-sidebar-foreground/60 p-4 rounded-xl text-sm font-semibold">
              <XCircle className="size-4 text-sidebar-foreground/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sidebar-foreground">LinkedIn Not Connected</p>
                <p className="text-xs text-sidebar-foreground/50 font-normal mt-0.5">Please sign in above.</p>
              </div>
            </div>
          )}
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-sidebar-foreground/50 max-w-[55%]">
            {user ? "Settings saved to your cloud profile." : "Settings saved locally in this browser."}
          </p>
          <Button
            onClick={() => setOpen(false)}
            className="bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold px-5 py-2.5 rounded-xl transition duration-200 shadow-lg cursor-pointer text-sm h-auto"
          >
            Apply Settings
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
