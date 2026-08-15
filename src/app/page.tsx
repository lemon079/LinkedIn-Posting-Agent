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
import { AssistantErrorState } from "@/components/assistant-ui";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SAMPLE_POST } from "@/lib/devSamplePost";

const IS_DEV = process.env.NODE_ENV === "development";

export default function Home() {
  const agentState = useAgent();
  const {
    customTopic, context, domain,
    draftText, streamingText, postUrl, isGenerating, isPublishing, error,
    provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, isSettingsOpen,
    user, token,
    selectedFiles, isUploading,
    reasoningSteps,
    setCustomTopic, setContext, setDomain, setDraftText, setStreamingText,
    handleGenerate, handlePublish, handleClearDraft,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl,
    setLiToken, setLiUrn, setIsSettingsOpen,
    setSelectedFiles, handleUploadFile,
    setReasoningSteps,
  } = agentState;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [devPreview, setDevPreview] = useState(false);

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
    token: token || undefined,
    onDraftReceived: (draft, steps) => {
      setDraftText(draft);
      setStreamingText(null);
      if (steps && steps.length > 0) {
        setReasoningSteps(steps);
      }
    },
    onError: (err) => {
      toast.error(err);
    },
  });

  const effectiveDraft = IS_DEV && devPreview ? SAMPLE_POST : draftText;
  const effectiveStreaming = IS_DEV && devPreview ? null : streamingText;

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const onPublishClick = () => {
    if (provider === "gemini") {
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
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm space-y-1.5 shadow-sm animate-fade-in-up">
                <p className="font-bold">🎉 Post published successfully!</p>
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  View live post on LinkedIn →
                </a>
              </div>
            )}

            {error && !isGenerating && effectiveDraft === null && (
              <div className="mb-4">
                <AssistantErrorState
                  error={error}
                  onRetry={handleGenerate}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>
            )}

            {isGenerating || effectiveStreaming !== null || effectiveDraft !== null ? (
              <div className="space-y-4 animate-fade-in-up">
                <EditorPanel
                  draftText={effectiveDraft}
                  streamingText={effectiveStreaming}
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
          user={user}
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

        {/* Development preview toggle */}
        {IS_DEV && (
          <div className="fixed bottom-4 right-4 z-50">
            <button
              onClick={() => setDevPreview((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-700 shadow-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <Sparkles className="size-3 text-brand-blue" />
              Dev Preview: {devPreview ? "ON" : "OFF"}
            </button>
          </div>
        )}
      </div>
    </AssistantRuntimeProvider>
  );
}
