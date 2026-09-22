"use client";

import React, { useState, useCallback } from "react";

import { useAgent } from "@/hooks/useAgent";
import { useAgentRuntime } from "@/hooks/useAgentRuntime";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Header } from "@/components/Header";
import { ControlPanel } from "@/components/ControlPanel";
import { EditorPanel } from "@/components/EditorPanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, ExternalLink, Plus, Sparkles, Loader2, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";


const SHOWCASE_TOPIC = "Why we migrated from synchronous REST to event-driven Kafka in production";
const SHOWCASE_CONTEXT = "Reduced p99 latency by 68% and handled a 10x traffic spike without node degradation. Key lessons on idempotent workers and dead-letter queues.";
const SHOWCASE_DRAFT = `We were facing 1.8s p99 latency on our core order-processing service.

Every traffic spike triggered cascading timeouts across three downstream microservices.

Here is the exact architecture change that reduced p99 latency by 68%:

1. Decoupled write-heavy endpoints using Apache Kafka message streaming.
2. Implemented strict consumer idempotency using Redis SETNX deduplication keys.
3. Isolated poison messages into dedicated Dead Letter Queues (DLQ) with automated replay policies.

The result?
- 68% decrease in p99 latency
- Zero dropped events during our last 10x traffic spike
- 40% reduction in database connection pool contention

Architectural lesson: Never let synchronous REST dependencies dictate your system's availability boundaries.

What strategies has your team used to decouple high-throughput microservices?`;

const SHOWCASE_STEPS = [
  { title: "Analyzing Architecture Context", output: "Identified high-impact technical takeaway on event-driven decoupling." },
  { title: "Calibrating Engineering Voice", output: "Configured direct, senior-engineer technical authority with metrics." },
  { title: "Drafting Post & Hook Optimization", output: "Generated hook and structured takeaway points for maximum readability." },
];

export default function Home() {
  const agentState = useAgent();
  const {
    customTopic, context, domain, archetype, tone,
    draftText, streamingText, postUrl, isGenerating, isPublishing, error,
    provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt, isSettingsOpen,
    user,
    isHydrating,
    isAuthenticated,
    selectedFiles, isUploading,
    reasoningSteps,
    alternativeHooks,
    draftVersions,
    activeVersionIndex,
    setAlternativeHooks,
    handleApplyHook,
    addDraftVersion,
    initDraftVersions,
    handleUndo,
    handleRedo,
    handleSelectVersion,
    setCustomTopic, setContext, setDomain, setArchetype, setTone, setDraftText, setStreamingText, threadId,
    handleGenerate, handlePublish, handleClearDraft, handleNewPost, handleDismissError,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl,
    setLiToken, setLiUrn, setIsSettingsOpen,
    setSelectedFiles, handleUploadFile,
    token,
    handleSaveSettings,
    handleSignOut, handleDisconnectLinkedIn,
  } = agentState;

  const [isRedirectingToLogin, setIsRedirectingToLogin] = useState(false);
  const [mobileTab, setMobileTab] = useState<"controls" | "draft">("controls");

  const handleInitiateLinkedInLogin = useCallback(() => {
    setIsRedirectingToLogin(true);
    window.location.href = "/api/auth/linkedin?state=login";
  }, []);

  const runtime = useAgentRuntime({
    customTopic,
    context,
    domain,
    archetype,
    tone,
    provider,
    apiKey,
    modelName,
    ollamaBaseUrl,
    liToken,
    liUrn,
    currentDraft: draftText || undefined,
    threadId: threadId || undefined,
    alternativeHooks,
    onDraftReceived: (draft, _steps, tId, changeNote, altHooks) => {
      setMobileTab("draft");
      const hooksToUse = altHooks && altHooks.length > 0 ? altHooks : [];
      setAlternativeHooks(hooksToUse);
      if (tId) localStorage.setItem("praxis_thread_id", tId);

      if (changeNote && !changeNote.toLowerCase().includes("initial")) {
        setDraftText(draft);
        addDraftVersion(draft, changeNote, hooksToUse);
      } else {
        initDraftVersions(draft, hooksToUse, changeNote);
      }
    },
  });


  const effectiveTopic = !isAuthenticated && !customTopic ? SHOWCASE_TOPIC : customTopic;
  const effectiveContext = !isAuthenticated && !context ? SHOWCASE_CONTEXT : context;
  const effectiveDraft = !isAuthenticated && !draftText ? SHOWCASE_DRAFT : draftText;
  const effectiveSteps = !isAuthenticated && reasoningSteps.length === 0 ? SHOWCASE_STEPS : reasoningSteps;

  const linkedInUser = user
    ? {
        name:
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          (user.email ? user.email.split("@")[0] : undefined),
        email: user.email,
        avatarUrl:
          (user.user_metadata?.avatar_url as string) ||
          (user.user_metadata?.picture as string),
        headline: (user.user_metadata?.headline as string) || "Preview • Posting as yourself",
      }
    : null;

  const onGenerateClick = () => {
    if (!isAuthenticated) {
      handleInitiateLinkedInLogin();
      return;
    }
    setMobileTab("draft");
    handleGenerate();
  };

  const onNewPostClick = () => {
    handleNewPost();
    setMobileTab("controls");
  };

  const onPublishClick = () => {
    if (!isAuthenticated) {
      handleInitiateLinkedInLogin();
    } else {
      handlePublish();
    }
  };

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <Loader2 className="size-8 text-brand-blue animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Initializing workspace...</p>
      </div>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-brand-blue/20">
        <Header
          onOpenSettings={() => {
            if (!isAuthenticated) {
              handleInitiateLinkedInLogin();
              return;
            }
            if (!isGenerating) setIsSettingsOpen(true);
          }}
          onSignIn={handleInitiateLinkedInLogin}
          isAuthenticated={isAuthenticated}
          disabled={isGenerating}
          user={user}
          liToken={liToken}
        />

        <main className="flex-1 px-3.5 py-4 sm:px-5 sm:py-6 max-w-7xl w-full mx-auto">
          {/* Mobile View Switcher (< 1024px) */}
          <div className="flex lg:hidden items-center justify-center p-1 bg-muted/60 dark:bg-slate-900/60 rounded-xl border border-border/80 mb-4 w-full select-none shadow-2xs">
            <button
              type="button"
              onClick={() => setMobileTab("controls")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer",
                mobileTab === "controls"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sliders className="size-3.5" />
              <span>Controls</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("draft")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer relative",
                mobileTab === "draft"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="size-3.5 text-brand-blue" />
              <span>Draft Workspace</span>
              {isGenerating && (
                <span className="relative flex size-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-brand-blue" />
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 items-start">
            <aside className={cn("lg:col-span-2", mobileTab === "controls" ? "block" : "hidden lg:block")}>
              <ControlPanel
                customTopic={effectiveTopic}
                context={effectiveContext}
                domain={domain}
                archetype={archetype}
                tone={tone}
                isGenerating={isGenerating}
                setCustomTopic={setCustomTopic}
                setContext={setContext}
                setDomain={setDomain}
                setArchetype={setArchetype}
                setTone={setTone}
                onGenerate={onGenerateClick}
              />
            </aside>

            <section className={cn("lg:col-span-3 space-y-6", mobileTab === "draft" ? "block" : "hidden lg:block")}>
              {postUrl && (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl shadow-level-1 animate-fade-in-up flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                        Post successfully published to LinkedIn!
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Your post is now live and public on your feed.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                    >
                      <span>View Post</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onNewPostClick}
                      className="h-8 px-3 text-xs font-semibold gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>New Post</span>
                    </Button>
                  </div>
                </div>
              )}

              {isGenerating || streamingText !== null || effectiveDraft !== null || Boolean(error) ? (
                <div className="space-y-4 animate-fade-in-up">
                  <EditorPanel
                    draftText={effectiveDraft}
                    streamingText={streamingText}
                    isGenerating={isGenerating}
                    onStreamingComplete={() => {
                      setDraftText(streamingText);
                      setStreamingText(null);
                    }}
                    isPublishing={isPublishing}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    isUploading={isUploading}
                    onUploadFile={isAuthenticated ? handleUploadFile : handleInitiateLinkedInLogin}
                    onChange={isAuthenticated ? setDraftText : () => {}}
                    onPublish={onPublishClick}
                    onDiscard={handleClearDraft}
                    onRetry={onGenerateClick}
                    onOpenSettings={isAuthenticated ? () => setIsSettingsOpen(true) : handleInitiateLinkedInLogin}
                    error={error}
                    onDismissError={handleDismissError}
                    reasoningSteps={effectiveSteps}
                    alternativeHooks={alternativeHooks}
                    onApplyHook={handleApplyHook}
                    draftVersions={draftVersions}
                    activeVersionIndex={activeVersionIndex}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onSelectVersion={handleSelectVersion}
                    user={linkedInUser}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 sm:py-24 border border-dashed border-border rounded-xl sm:rounded-2xl text-muted-foreground space-y-3 bg-card shadow-level-1 animate-fade-in-up hover:border-outline transition duration-300">
                  <FileText className="size-10 text-slate-300 animate-bounce duration-1000" />
                  <p className="text-xs sm:text-sm font-medium text-slate-500 text-center px-4">
                    Configure parameters and generate a post draft.
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>

        {!isAuthenticated && (
          <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2.5px] flex items-center justify-center p-3.5 sm:p-4 animate-fade-in">
            <div className="bg-white/95 dark:bg-slate-900/95 border border-white/20 dark:border-slate-800 shadow-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-lg w-full text-center space-y-4 sm:space-y-5 animate-fade-in-up max-h-[90dvh] overflow-y-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                <Sparkles className="size-3.5" />
                <span>Live Agentic Workspace Preview</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Connect with LinkedIn to Start Creating
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Praxis AI ghostwrites authentic technical posts in your engineering voice and publishes directly to your network.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-left space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>Calibrates tone & style from your authentic LinkedIn profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>Autonomous multi-agent drafting, critique & guardrail loops</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>1-click direct publishing to your public LinkedIn feed</span>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                disabled={isRedirectingToLogin}
                onClick={handleInitiateLinkedInLogin}
                className="w-full h-11 bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold rounded-xl text-sm gap-2 shadow-md cursor-pointer transition flex items-center justify-center"
              >
                {isRedirectingToLogin ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <svg className="size-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45c-.9 0-1.63.73-1.63 1.63 0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63Z" />
                  </svg>
                )}
                <span>{isRedirectingToLogin ? "Connecting to LinkedIn..." : "Sign in with LinkedIn to Unlock"}</span>
              </Button>
            </div>
          </div>
        )}

        <SettingsDialog
          isOpen={isAuthenticated && isSettingsOpen}
          isAuthenticated={isAuthenticated}
          onClose={() => setIsSettingsOpen(false)}
          provider={provider}
          setProvider={setProvider}
          apiKey={apiKey}
          setApiKey={setApiKey}
          modelName={modelName}
          setModelName={setModelName}
          ollamaBaseUrl={ollamaBaseUrl}
          setOllamaBaseUrl={setOllamaBaseUrl}
          liToken={liToken}
          setLiToken={setLiToken}
          liUrn={liUrn}
          setLiUrn={setLiUrn}
          liTokenExpiresAt={liTokenExpiresAt}
          user={user}
          token={token}
          onSave={handleSaveSettings}
          onSignOut={handleSignOut}
          onDisconnectLinkedIn={handleDisconnectLinkedIn}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}
