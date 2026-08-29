"use client";

import React, { useState, useEffect } from "react";
import { useAgent } from "@/hooks/useAgent";
import { useAgentRuntime } from "@/hooks/useAgentRuntime";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Header } from "@/components/Header";
import { ControlPanel } from "@/components/ControlPanel";
import { EditorPanel } from "@/components/EditorPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AuthForm } from "@/components/AuthForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssistantErrorState } from "@/components/assistant-ui";
import { FileText, CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const agentState = useAgent();
  const {
    customTopic, context, domain,
    draftText, streamingText, postUrl, isGenerating, isPublishing, error,
    provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, liTokenExpiresAt, isSettingsOpen,
    user,
    selectedFiles, isUploading,
    reasoningSteps,
    setCustomTopic, setContext, setDomain, setDraftText, setStreamingText,
    handleGenerate, handlePublish, handleClearDraft, handleNewPost,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl,
    setLiToken, setLiUrn, setIsSettingsOpen,
    setSelectedFiles, handleUploadFile,
    handleSignOut, handleDisconnectLinkedIn,
  } = agentState;

  const [showLoginModal, setShowLoginModal] = useState(false);

  const runtime = useAgentRuntime({
    customTopic,
    context,
    domain,
    provider,
    apiKey,
    modelName,
    ollamaBaseUrl,
    liToken,
    liUrn,
    onDraftReceived: (draft, _steps, tId) => {
      setDraftText(draft);
      if (tId) localStorage.setItem("praxis_thread_id", tId);
    },
    onError: (err) => {
      toast.error(err);
    },
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const onPublishClick = () => {
    if (!user && !liToken) {
      setShowLoginModal(true);
    } else {
      handlePublish();
    }
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-brand-blue/20">
        <Header
          onOpenSettings={() => {
            if (!isGenerating) setIsSettingsOpen(true);
          }}
          disabled={isGenerating}
          user={user}
          liToken={liToken}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-6 items-start">
          <aside className="lg:col-span-2">
            <ControlPanel
              customTopic={customTopic}
              context={context}
              domain={domain}
              isGenerating={isGenerating}
              setCustomTopic={setCustomTopic}
              setContext={setContext}
              setDomain={setDomain}
              onGenerate={handleGenerate}
            />
          </aside>

          <section className="lg:col-span-3 space-y-6">
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
                    onClick={handleNewPost}
                    className="h-8 px-3 text-xs font-semibold gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>New Post</span>
                  </Button>
                </div>
              </div>
            )}

            {error && !isGenerating && draftText === null && (
              <div className="mb-4">
                <AssistantErrorState
                  error={error}
                  onRetry={handleGenerate}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>
            )}

            {isGenerating || streamingText !== null || draftText !== null ? (
              <div className="space-y-4 animate-fade-in-up">
                <EditorPanel
                  draftText={draftText}
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
                  onUploadFile={handleUploadFile}
                  onChange={setDraftText}
                  onPublish={onPublishClick}
                  onDiscard={handleClearDraft}
                  onRetry={handleGenerate}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  error={error}
                  reasoningSteps={reasoningSteps}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border rounded-2xl text-muted-foreground space-y-3 bg-card shadow-level-1 animate-fade-in-up hover:border-outline transition duration-300">
                <FileText className="size-10 text-slate-300 animate-bounce duration-1000" />
                <p className="text-xs sm:text-sm font-medium text-slate-500 text-center px-4">
                  Configure parameters and generate a post draft.
                </p>
              </div>
            )}
          </section>
        </main>

        <SettingsPanel
          isOpen={isSettingsOpen}
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
          onSignOut={handleSignOut}
          onDisconnectLinkedIn={handleDisconnectLinkedIn}
        />

        <Dialog open={showLoginModal} onOpenChange={(open) => setShowLoginModal(open)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Sign in with LinkedIn</DialogTitle>
            </DialogHeader>
            <AuthForm
              onSuccess={() => {
                setShowLoginModal(false);
                handlePublish();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AssistantRuntimeProvider>
  );
}
