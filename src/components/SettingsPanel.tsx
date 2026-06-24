import React, { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useMedia } from "use-media";
import { healthCheck } from "../lib/api";
import { AuthForm } from "./AuthForm";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Settings2,
  Sparkles,
  Layers,
  Link2,
  Globe,
  User as UserIcon,
  LogOut
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
  tavilyKey: string;
  setTavilyKey: (val: string) => void;
  liToken: string;
  liUrn: string;
  user: User | null;
}

function cleanErrorMessage(rawError: string): string {
  const err = rawError.toLowerCase();
  if (err.includes("key") && (err.includes("invalid") || err.includes("not found") || err.includes("bad") || err.includes("401") || err.includes("403"))) {
    return "Invalid API Key. Please verify and update your key.";
  }
  if (err.includes("fetch failed") || err.includes("econnrefused") || err.includes("enotfound") || err.includes("failed to fetch") || err.includes("network")) {
    return "Network connection failed. Please check your internet connection and verify if the service is running.";
  }
  if (err.includes("rate limit") || err.includes("quota") || err.includes("429") || err.includes("exhausted")) {
    return "API rate limit or quota exceeded. Please check your billing or try again later.";
  }
  if (err.includes("model") && (err.includes("not found") || err.includes("does not exist") || err.includes("404"))) {
    return "The selected model was not found or is not supported.";
  }
  if (err.includes("unreachable")) {
    return "The service is unreachable. Please verify the URL and check if the service is running.";
  }
  if (rawError.length < 80) {
    return rawError;
  }
  return "Connection failed. Please verify your credentials and network settings.";
}

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
  tavilyKey,
  setTavilyKey,
  liToken,
  liUrn,
  user,
}) => {
  const [testState, setTestState] = useState<{
    status: "idle" | "testing" | "success" | "error";
    errorMsg?: string;
    discoveredModels?: string[];
  }>({ status: "idle" });

  const isWide = useMedia("(min-width: 768px)");

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
          errorMsg: response.error || "Could not connect to Ollama. Make sure it's running on your machine."
        });
      }
    } catch (err) {
      setOllamaModels([]);
      setOllamaFetchState({
        status: "unreachable",
        errorMsg: err instanceof Error ? err.message : "Could not connect to Ollama. Make sure it's running on your machine."
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

  const renderPanelBody = () => (
    <>
      {/* Header */}
      <div className="p-6 border-b border-border bg-slate-50/50 flex items-center gap-3">
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
            Configure your account sync, AI engine, and search keys.
          </p>
        </div>
      </div>

      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-900 select-text">
        {/* Section: Cloud Sync Account */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <UserIcon className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Account Sync
            </h3>
          </div>

          {user ? (
            <div className="bg-slate-50 border border-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-500">Signed In As</p>
                  <p className="text-sm font-bold text-slate-800">{user.email}</p>
                </div>
                <Button
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                  }}
                  className="bg-white hover:bg-slate-50 border border-border text-slate-700 hover:text-rose-600 hover:border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition duration-150 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </Button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                ✓ Settings synchronized. Your configurations are saved securely.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-border p-4 rounded-xl space-y-4">
              <AuthForm onSuccess={() => { }} />
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  If you proceed without signing in, settings will only be saved locally in this browser.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section: LLM Integration */}
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
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setTestState({ status: "idle" });
                }}
                className="w-full bg-card border border-border text-slate-800 text-base md:text-sm p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition duration-200"
              >
                <option value="gemini">Google</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>

            {/* Ollama Base URL (Ollama Only) */}
            {provider === "ollama" && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs font-semibold text-slate-700">
                  Ollama Base URL
                </Label>
                <input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={ollamaBaseUrl}
                  onChange={(e) => {
                    setOllamaBaseUrl(e.target.value);
                    setTestState({ status: "idle" });
                  }}
                  className="w-full bg-card border border-border text-slate-800 text-base md:text-sm placeholder:text-xs p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition duration-200"
                />
                <p className="text-xs text-slate-500">
                  Verify Ollama is running locally or on your private network.
                </p>
              </div>
            )}

            {/* API Key (Cloud Providers Only) */}
            {provider !== "ollama" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  API Key
                </Label>
                <input
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
                  className="w-full bg-card border border-border text-slate-800 text-base md:text-sm placeholder:text-xs p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition duration-200"
                />
              </div>
            )}

            {/* Model Name Override (Ollama Only) */}
            {provider === "ollama" && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Model Name</span>
                  <span className="text-xs text-slate-450 font-normal">
                    Select local model
                  </span>
                </Label>

                {ollamaFetchState.status === "loading" && (
                  <div className="flex items-center gap-2 p-3 text-xs text-slate-500 bg-slate-50 border border-border rounded-xl">
                    <Loader2 className="size-3.5 animate-spin text-brand-blue" />
                    Fetching local models from Ollama...
                  </div>
                )}

                {ollamaFetchState.status === "unreachable" && (
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl space-y-1">
                      <p className="font-semibold">⚠️ Connection Error</p>
                      <p>{cleanErrorMessage(ollamaFetchState.errorMsg || "Could not connect to Ollama. Make sure it's running on your machine.")}</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. llama3, mistral"
                        value={modelName}
                        onChange={(e) => {
                          setModelName(e.target.value);
                          setTestState({ status: "idle" });
                        }}
                        className="flex-1 bg-card border border-border text-slate-800 text-base md:text-sm placeholder:text-xs p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition duration-200"
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
                      <p>No models found on your machine. Pull a model using <code className="bg-amber-100/60 px-1 py-0.5 rounded font-mono">ollama pull &lt;model-name&gt;</code>.</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. llama3, mistral"
                        value={modelName}
                        onChange={(e) => {
                          setModelName(e.target.value);
                          setTestState({ status: "idle" });
                        }}
                        className="flex-1 bg-card border border-border text-slate-800 text-base md:text-sm placeholder:text-xs p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition duration-200"
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

                {(ollamaFetchState.status === "success" || (ollamaFetchState.status === "idle" && ollamaModels.length > 0)) && (
                  <select
                    value={modelName}
                    onChange={(e) => {
                      setModelName(e.target.value);
                      setTestState({ status: "idle" });
                    }}
                    className="w-full bg-card border border-border text-slate-800 text-base md:text-sm p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition duration-200"
                  >
                    <option value="">Select a model...</option>
                    {ollamaModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}

                {/* Available models pills (if discovered from Ollama tags) */}
                {ollamaModels.length > 0 && (ollamaFetchState.status === "success" || ollamaFetchState.status === "idle") && (
                  <div className="space-y-1 mt-2">
                    <span className="text-xs text-slate-550 block font-semibold">Quick Select:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {ollamaModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModelName(m)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition duration-150 cursor-pointer ${modelName === m
                            ? "bg-brand-blue border-brand-blue text-white font-semibold"
                            : "bg-slate-100 border-border text-slate-650 hover:bg-slate-200 hover:border-slate-400"
                            }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Test Connection Actions */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={testState.status === "testing"}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-border hover:border-slate-300 text-slate-700 rounded-xl py-2.5 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
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

              {/* Connection results output */}
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

        {/* Section: Web Search Grounding */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <Globe className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Web Search Integration
            </h3>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Tavily API Key
            </Label>
            <input
              type="password"
              placeholder="tvly-..."
              value={tavilyKey}
              onChange={(e) => setTavilyKey(e.target.value)}
              className="w-full bg-card border border-border text-slate-800 text-base md:text-sm placeholder:text-xs p-3 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition duration-200"
            />
            <p className="text-xs text-slate-500">
              Optional. Used to fetch real-time facts and references from the web.
            </p>
          </div>
        </div>

        {/* Section: LinkedIn Integration */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <Link2 className="size-4 text-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              LinkedIn Account
            </h3>
          </div>

          <div className="space-y-4">
            {liToken && liUrn ? (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold animate-fade-in-up">
                <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-emerald-900">LinkedIn Connected</p>
                  <p className="text-xs text-slate-500 font-normal mt-0.5 font-mono truncate">{liUrn}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-border text-slate-500 p-4 rounded-xl text-sm font-semibold animate-fade-in-up">
                <XCircle className="size-4.5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-700">LinkedIn Not Connected</p>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">Please sign in to the portal using LinkedIn above.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-slate-50/30 flex items-center justify-between">
        <p className="text-xs text-slate-500 max-w-[50%]">
          {user
            ? "Your settings are securely saved in your cloud profile."
            : "Your settings are saved locally in this browser."}
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
          className="w-full max-w-lg bg-card border-l border-border h-full p-0 flex flex-col justify-between shadow-2xl text-slate-900 overflow-hidden"
        >
          {renderPanelBody()}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        className="w-full max-h-[92vh] bg-card border-t border-border flex flex-col justify-between shadow-2xl text-slate-900 overflow-hidden rounded-t-2xl"
      >
        {renderPanelBody()}
      </DrawerContent>
    </Drawer>
  );
};
