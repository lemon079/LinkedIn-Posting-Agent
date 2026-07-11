"use client";

import { useState, useEffect } from "react";
import { ControlPanel } from "@/components/ControlPanel";
import { EditorPanel } from "@/components/EditorPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Header } from "@/components/Header";
import { useAgent } from "@/hooks/useAgent";
import { FileText, FlaskConical } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { LinkedInFeed } from "@/components/LinkedInFeed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SAMPLE_POST } from "@/lib/devSamplePost";

const IS_DEV = process.env.NODE_ENV === "development";

export default function Home() {
  const agentState = useAgent();
  const {
    customTopic, context, domain,
    draftText, streamingText, postUrl, isGenerating, isPublishing, error, activeTab,
    provider, apiKey, modelName, ollamaBaseUrl, liToken, liUrn, isSettingsOpen,
    user, isTauri,
    selectedFiles, isUploading,
    reasoningSteps,
    setCustomTopic, setContext, setDomain, setDraftText, setStreamingText,
    handleGenerate, handlePublish,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl,
    setLiToken, setLiUrn, setIsSettingsOpen,
    setSelectedFiles, handleUploadFile,
  } = agentState;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const effectiveDraft = IS_DEV && devPreview ? SAMPLE_POST : draftText;
  const effectiveStreaming = IS_DEV && devPreview ? null : streamingText;

  const onPublishClick = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      handlePublish();
    }
  };

  return (
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
              <a href={postUrl} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline inline-flex items-center gap-1 font-semibold">View live post on LinkedIn →</a>
            </div>
          )}
          {(isGenerating || effectiveStreaming !== null || effectiveDraft !== null) ? (
            <div className="space-y-4 animate-fade-in-up">
              {activeTab === "preview" && effectiveDraft !== null && !(IS_DEV && devPreview) ? (
                <LinkedInFeed draftText={effectiveDraft} selectedFiles={selectedFiles} />
              ) : (
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
                  reasoningSteps={reasoningSteps}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border rounded-2xl text-slate-400 space-y-3 bg-card shadow-sm animate-fade-in-up hover:border-slate-300 transition duration-300">
              <FileText className="size-10 text-slate-300 animate-bounce duration-1000" />
              <p className="text-xs sm:text-sm font-medium text-slate-500 text-center px-4">Configure parameters and generate a post draft.</p>
            </div>
          )}
        </section>
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        provider={provider} setProvider={setProvider}
        apiKey={apiKey} setApiKey={setApiKey}
        modelName={modelName} setModelName={setModelName}
        ollamaBaseUrl={ollamaBaseUrl} setOllamaBaseUrl={setOllamaBaseUrl}
        liToken={liToken} setLiToken={setLiToken}
        liUrn={liUrn} setLiUrn={setLiUrn}
        user={user} isTauri={isTauri}
      />

      {/* Dev-only floating toggle — bottom-right corner */}
      {IS_DEV && (
        <button
          type="button"
          title={devPreview ? "Exit dev preview" : "Enter dev preview"}
          onClick={() => setDevPreview((v) => !v)}
          className={`fixed bottom-5 right-5 z-50 flex items-center justify-center size-10 rounded-full shadow-lg transition-all duration-200 cursor-pointer border-2 ${
            devPreview
              ? "bg-amber-500 border-amber-600 text-white shadow-amber-200"
              : "bg-card border-border text-muted-foreground hover:border-amber-400 hover:text-amber-500"
          }`}
        >
          <FlaskConical className="size-4" />
        </button>
      )}

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-slate-900">Sign In Required</DialogTitle>
          </DialogHeader>
          <AuthForm onSuccess={() => setShowLoginModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
