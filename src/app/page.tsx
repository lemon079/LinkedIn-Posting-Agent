"use client";

import { useState } from "react";
import { ControlPanel } from "@/components/ControlPanel";
import { EditorPanel } from "@/components/EditorPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Header } from "@/components/Header";
import { useAgent } from "@/hooks/useAgent";
import { FileText, FlaskConical } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { LinkedInFeed } from "@/components/LinkedInFeed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SAMPLE_POST } from "@/lib/devSamplePost";

const IS_DEV = process.env.NODE_ENV === "development";

export default function Home() {
  const agentState = useAgent();
  const {
    customTopic, context,
    draftText, streamingText, postUrl, isGenerating, isPublishing, error, activeTab,
    provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn, isSettingsOpen,
    user, isTauri,
    selectedFiles, isUploading,
    setCustomTopic, setContext, setDraftText, setStreamingText,
    handleGenerate, handlePublish,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl, setTavilyKey,
    setLiToken, setLiUrn, setIsSettingsOpen,
    setSelectedFiles, handleUploadFile,
  } = agentState;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [devPreview, setDevPreview] = useState(false);

  // In dev mode, resolve the effective draft so components see sample content
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
          if (!isGenerating) {
            setIsSettingsOpen(true);
          }
        }}
        disabled={isGenerating}
      />

      {/* Dev-only preview toggle bar */}
      {IS_DEV && (
        <div className="border-b border-border bg-amber-50/70 px-6 py-2 flex items-center gap-3">
          <FlaskConical className="size-3.5 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-700">Dev Mode</span>
          <button
            type="button"
            onClick={() => setDevPreview((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              devPreview ? "bg-amber-500" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                devPreview ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs text-amber-600">
            {devPreview ? "Showing sample post — upload files to test" : "Toggle to load a sample post"}
          </span>
        </div>
      )}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2">
          <ControlPanel
            customTopic={customTopic}
            context={context}
            isGenerating={isGenerating}
            setCustomTopic={setCustomTopic}
            setContext={setContext}
            onGenerate={handleGenerate}
          />
        </div>
        <div className="lg:col-span-3 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium animate-fade-in-up">⚠️ {error}</div>}
          {postUrl && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm space-y-1.5 shadow-sm animate-fade-in-up">
              <p className="font-bold">🎉 Post published successfully!</p>
              <a href={postUrl} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline inline-flex items-center gap-1 font-semibold">View live post on LinkedIn →</a>
            </div>
          )}
          {(isGenerating || effectiveStreaming !== null || effectiveDraft !== null) ? (
            <div className="space-y-4 animate-fade-in-up">
              {activeTab === "preview" && effectiveDraft !== null ? (
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
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border rounded-2xl text-slate-400 space-y-3 bg-card shadow-sm animate-fade-in-up hover:border-slate-300 transition duration-300">
              <FileText className="size-10 text-slate-300 animate-bounce duration-1000" />
              <p className="text-xs sm:text-sm font-medium text-slate-500 text-center px-4">Configure parameters and generate a post draft.</p>
            </div>
          )}
        </div>
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        provider={provider} setProvider={setProvider}
        apiKey={apiKey} setApiKey={setApiKey}
        modelName={modelName} setModelName={setModelName}
        ollamaBaseUrl={ollamaBaseUrl} setOllamaBaseUrl={setOllamaBaseUrl}
        tavilyKey={tavilyKey} setTavilyKey={setTavilyKey}
        liToken={liToken}
        setLiToken={setLiToken}
        liUrn={liUrn}
        setLiUrn={setLiUrn}
        user={user}
        isTauri={isTauri}
      />

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
