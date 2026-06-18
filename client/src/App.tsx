import { Button } from "@/components/ui/button";
import { ControlPanel } from "./components/ControlPanel.js";
import { LinkedInFeed } from "./components/LinkedInFeed.js";
import { EditorPanel } from "./components/EditorPanel.js";
import { useAgent } from "./hooks/useAgent.js";

export default function App() {
  const agentState = useAgent();
  const {
    topics, selectedTopic, customTopic, context, dryRun,
    draftText, postUrl, isGenerating, isPublishing, error, activeTab,
    setSelectedTopic, setCustomTopic, setContext, setDryRun, setDraftText,
    setActiveTab, handleGenerate, handlePublish,
  } = agentState;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0B0F19] to-slate-950 text-slate-100 flex flex-col antialiased selection:bg-accent/40 selection:text-white">
      <header className="border-b border-white/[0.05] p-6 bg-white/[0.01] backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
          <span className="text-accent">LinkedIn</span> Posting Agent
        </h1>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Agent Node Online</span>
        </div>
      </header>
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <ControlPanel
            topics={topics} selectedTopic={selectedTopic} customTopic={customTopic}
            context={context} dryRun={dryRun} isGenerating={isGenerating}
            setSelectedTopic={setSelectedTopic} setCustomTopic={setCustomTopic}
            setContext={setContext} setDryRun={setDryRun} onGenerate={handleGenerate}
          />
        </div>
        <div className="lg:col-span-3 space-y-6">
          {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-medium">⚠️ {error}</div>}
          {postUrl && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm space-y-1.5 shadow-md">
              <p className="font-bold">🎉 Post published successfully!</p>
              <a href={postUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">View live post on LinkedIn →</a>
            </div>
          )}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 backdrop-blur-md bg-white/[0.02] border border-white/[0.05] rounded-2xl animate-pulse">
              <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Ghostwriter is researching & drafting post...</p>
            </div>
          )}
          {draftText !== null && (
            <div className="space-y-4">
              <div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/[0.05] w-fit">
                <Button className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === "preview" ? "bg-accent text-white" : "bg-transparent text-slate-400 hover:text-slate-200"}`} onClick={() => setActiveTab("preview")}>LinkedIn Mockup</Button>
                <Button className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === "edit" ? "bg-accent text-white" : "bg-transparent text-slate-400 hover:text-slate-200"}`} onClick={() => setActiveTab("edit")}>Interactive Editor</Button>
              </div>
              {activeTab === "preview" ? <LinkedInFeed draftText={draftText} /> : <EditorPanel draftText={draftText} isPublishing={isPublishing} onChange={setDraftText} onPublish={handlePublish} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
