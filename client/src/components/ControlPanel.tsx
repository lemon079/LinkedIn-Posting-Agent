import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sliders, Sparkles } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ControlPanelProps {
  topics: string[]; selectedTopic: string; customTopic: string;
  context: string; dryRun: boolean; isGenerating: boolean;
  setSelectedTopic: (val: string) => void; setCustomTopic: (val: string) => void;
  setContext: (val: string) => void; setDryRun: (val: boolean) => void;
  onGenerate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  topics, selectedTopic, customTopic, context, dryRun, isGenerating,
  setSelectedTopic, setCustomTopic, setContext, setDryRun, onGenerate,
}) => {
  return (
    <Card className="bg-card border border-border shadow-sm rounded-2xl transition duration-300">
      <CardHeader className="border-b border-border pb-4 flex flex-row items-center gap-2">
        <Sliders className="size-4 text-brand-blue" />
        <CardTitle className="text-sm font-bold tracking-tight text-slate-800">Configure Agent Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic-select" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Default Genres</Label>
          <Select onValueChange={(val) => setSelectedTopic(val === "custom" ? "" : val)}>
            <SelectTrigger id="topic-select" className="w-full bg-card border-border hover:bg-slate-50 transition-colors text-slate-800">
              <SelectValue placeholder="Select topic category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-slate-800 animate-fade-in-up">
              {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              <SelectItem value="custom">Custom (Specify Below)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="custom-topic" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom Topic</Label>
          <input
            id="custom-topic"
            className="w-full bg-card border border-border text-slate-900 p-2.5 rounded-lg focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/40 outline-none transition placeholder-slate-400 text-sm disabled:opacity-50 disabled:bg-slate-50"
            placeholder={selectedTopic ? "Default genre selected above..." : "Enter custom post topic..."}
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            disabled={selectedTopic !== ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="context-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Additional Context</Label>
          <Textarea
            id="context-input"
            className="w-full bg-card border-border min-h-[90px] rounded-lg focus-visible:ring-brand-blue/40 text-sm placeholder-slate-400 text-slate-900 transition-colors duration-200"
            placeholder="Paste code blocks, docs references, or tone limits..." value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-b border-border">
          <Label htmlFor="dry-run" className="text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">Dry-Run Mode</Label>
          <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} className="transition" />
        </div>
        <Button
          className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold transition py-5 rounded-lg flex items-center justify-center gap-2 shadow-sm duration-200"
          onClick={onGenerate} disabled={isGenerating || (!selectedTopic && !customTopic)}
        >
          {isGenerating ? "Drafting Post..." : <><Sparkles className="size-4 animate-pulse" /> Generate Draft</>}
        </Button>
      </CardContent>
    </Card>
  );
};
