import { Button } from "@/components/ui/button";
import { ControlPanel } from "./components/ControlPanel.js";
import { LinkedInFeed } from "./components/LinkedInFeed.js";
import { EditorPanel } from "./components/EditorPanel.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { Header } from "./components/Header.js";
import { useAgent } from "./hooks/useAgent.js";
import { FileText, Eye, Edit3, Image } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function App() {
  const agentState = useAgent();
  const {
    topics, selectedTopic, customTopic, context, dryRun,
    draftText, postUrl, isGenerating, isPublishing, error, activeTab,
    imageUrl, isGeneratingImage, provider, apiKey, liToken, liUrn, isSettingsOpen,
    setSelectedTopic, setCustomTopic, setContext, setDryRun, setDraftText,
    setActiveTab, handleGenerate, handlePublish, handleGenerateImage, setImageUrl,
    setProvider, setApiKey, setLiToken, setLiUrn, setIsSettingsOpen,
  } = agentState;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-brand-blue/20">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2">
          <ControlPanel
            topics={topics} selectedTopic={selectedTopic} customTopic={customTopic}
            context={context} dryRun={dryRun} isGenerating={isGenerating}
            setSelectedTopic={setSelectedTopic} setCustomTopic={setCustomTopic}
            setContext={setContext} setDryRun={setDryRun} onGenerate={handleGenerate}
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
              <p className="text-sm font-medium text-slate-500">Configure parameters and generate a post draft.</p>
            </div>
          )}
          {draftText !== null && !isGenerating && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex bg-slate-200/50 p-1 rounded-lg border border-border w-fit">
                  <Button className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${activeTab === "preview" ? "bg-brand-blue text-white" : "bg-transparent text-slate-500 hover:text-slate-700"}`} onClick={() => setActiveTab("preview")}><Eye className="size-3.5" /> LinkedIn Mockup</Button>
                  <Button className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${activeTab === "edit" ? "bg-brand-blue text-white" : "bg-transparent text-slate-500 hover:text-slate-700"}`} onClick={() => setActiveTab("edit")}><Edit3 className="size-3.5" /> Interactive Editor</Button>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-border">
                  <Switch
                    id="toggle-image" checked={!!imageUrl} disabled={isGeneratingImage}
                    onCheckedChange={(val) => val ? handleGenerateImage() : setImageUrl(null)}
                  />
                  <Label htmlFor="toggle-image" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 select-none">
                    <Image className="size-3.5 text-indigo-600" />
                    {isGeneratingImage ? "Generating AI Graphic..." : "Include AI Graphic"}
                  </Label>
                </div>
              </div>
              {activeTab === "preview" ? <LinkedInFeed draftText={draftText} imageUrl={imageUrl} isGeneratingImage={isGeneratingImage} /> : <EditorPanel draftText={draftText} isPublishing={isPublishing} onChange={setDraftText} onPublish={handlePublish} />}
            </div>
          )}
        </div>
      </main>
      <SettingsPanel
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        provider={provider} setProvider={setProvider}
        apiKey={apiKey} setApiKey={setApiKey}
        liToken={liToken} setLiToken={setLiToken}
        liUrn={liUrn} setLiUrn={setLiUrn}
      />
    </div>
  );
}
