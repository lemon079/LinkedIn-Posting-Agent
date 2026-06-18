import { Button } from "@/components/ui/button";
import { ControlPanel } from "./components/ControlPanel.js";
import { LinkedInFeed } from "./components/LinkedInFeed.js";
import { EditorPanel } from "./components/EditorPanel.js";
import { useAgent } from "./hooks/useAgent.js";

export default function App() {
  const agentState = useAgent();
  const {
    topics,
    selectedTopic,
    customTopic,
    context,
    dryRun,
    draftText,
    postUrl,
    isGenerating,
    isPublishing,
    error,
    activeTab,
    setSelectedTopic,
    setCustomTopic,
    setContext,
    setDryRun,
    setDraftText,
    setActiveTab,
    handleGenerate,
    handlePublish,
  } = agentState;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <header className="border-b border-border-color p-6 bg-bg-secondary">
        <h1 className="text-xl font-bold">
          <span className="text-accent">LinkedIn</span> Posting Agent
        </h1>
      </header>
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2">
          <ControlPanel
            topics={topics}
            selectedTopic={selectedTopic}
            customTopic={customTopic}
            context={context}
            dryRun={dryRun}
            isGenerating={isGenerating}
            setSelectedTopic={setSelectedTopic}
            setCustomTopic={setCustomTopic}
            setContext={setContext}
            setDryRun={setDryRun}
            onGenerate={handleGenerate}
          />
        </div>
        <div className="lg:col-span-3 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-md text-sm">⚠️ {error}</div>}
          {postUrl && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-md text-sm space-y-1">
              <p className="font-semibold">🎉 Post published successfully!</p>
              <a href={postUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View post on LinkedIn</a>
            </div>
          )}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary gap-4">
              <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
              <p>Analyzing context and drafting post...</p>
            </div>
          )}
          {draftText !== null && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button className={`px-4 py-2 ${activeTab === "preview" ? "bg-accent text-white" : "bg-transparent border border-border-color text-text-secondary"}`} onClick={() => setActiveTab("preview")}>Feed Preview</Button>
                <Button className={`px-4 py-2 ${activeTab === "edit" ? "bg-accent text-white" : "bg-transparent border border-border-color text-text-secondary"}`} onClick={() => setActiveTab("edit")}>Live Editor</Button>
              </div>
              {activeTab === "preview" ? <LinkedInFeed draftText={draftText} /> : <EditorPanel draftText={draftText || ""} isPublishing={isPublishing} onChange={setDraftText} onPublish={handlePublish} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
