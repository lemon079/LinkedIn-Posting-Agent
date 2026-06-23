"use client";

import { ControlPanel } from "@/components/ControlPanel";
import { LinkedInFeed } from "@/components/LinkedInFeed";
import { EditorPanel } from "@/components/EditorPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Header } from "@/components/Header";
import { DraftTabs } from "@/components/DraftTabs";
import { useAgent } from "@/hooks/useAgent";
import { FileText } from "lucide-react";

export default function Home() {
  const agentState = useAgent();
  const {
    topics, selectedTopic, customTopic, context,
    draftText, postUrl, isGenerating, isPublishing, error, activeTab,
    provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn, isSettingsOpen,
    user,
    setSelectedTopic, setCustomTopic, setContext, setDraftText,
    setActiveTab, handleGenerate, handlePublish,
    setProvider, setApiKey, setModelName, setOllamaBaseUrl, setTavilyKey,
    setLiToken, setLiUrn, setIsSettingsOpen,
  } = agentState;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-brand-blue/20">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2">
          <ControlPanel
            topics={topics} selectedTopic={selectedTopic} customTopic={customTopic}
            context={context} isGenerating={isGenerating}
            setSelectedTopic={setSelectedTopic} setCustomTopic={setCustomTopic}
            setContext={setContext} onGenerate={handleGenerate}
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
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-2xl shadow-sm animate-fade-in-up">
              <div className="w-8 h-8 border-3 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Ghostwriter is researching & drafting post...</p>
            </div>
          )}
          {draftText === null && !isGenerating && (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border rounded-2xl text-slate-400 space-y-3 bg-card shadow-sm animate-fade-in-up hover:border-slate-300 transition duration-300">
              <FileText className="size-10 text-slate-300 animate-bounce duration-1000" />
              <p className="text-xs sm:text-sm font-medium text-slate-500 text-center px-4">Configure parameters and generate a post draft.</p>
            </div>
          )}
          {draftText !== null && !isGenerating && (
            <div className="space-y-4 animate-fade-in-up">
              <DraftTabs
                activeTab={activeTab} setActiveTab={setActiveTab}
              />
              {activeTab === "preview" ? <LinkedInFeed draftText={draftText} /> : <EditorPanel draftText={draftText} isPublishing={isPublishing} onChange={setDraftText} onPublish={handlePublish} />}
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
        liToken={liToken} setLiToken={setLiToken}
        liUrn={liUrn} setLiUrn={setLiUrn}
        user={user}
      />
    </div>
  );
}
