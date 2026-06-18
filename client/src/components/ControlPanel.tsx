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
    <Card className="backdrop-blur-md bg-white/[0.03] border border-white/[0.08] shadow-2xl rounded-2xl transition duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
      <CardHeader className="border-b border-white/[0.05] pb-4 flex flex-row items-center gap-2">
        <Sliders className="size-4 text-brand-blue" />
        <CardTitle className="text-sm font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Configure Agent Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic-select" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Genres</Label>
          <Select onValueChange={(val) => setSelectedTopic(val === "custom" ? "" : val)}>
            <SelectTrigger id="topic-select" className="w-full bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] transition">
              <SelectValue placeholder="Select topic category" />
            </SelectTrigger>
            <SelectContent className="bg-bg-secondary border-white/[0.08] text-text-primary">
              {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              <SelectItem value="custom">Custom (Specify Below)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="custom-topic" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Topic</Label>
          <input
            id="custom-topic"
            className="w-full bg-white/[0.02] border border-white/[0.08] text-text-primary p-2.5 rounded-lg focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/40 outline-none transition placeholder-slate-600 text-sm"
            placeholder="Enter custom post topic..." value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="context-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Additional Context</Label>
          <Textarea
            id="context-input"
            className="w-full bg-white/[0.02] border-white/[0.08] min-h-[90px] rounded-lg focus-visible:ring-brand-blue/40 text-sm placeholder-slate-600"
            placeholder="Paste code blocks, docs references, or tone limits..." value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.05]">
          <Label htmlFor="dry-run" className="text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer">Dry-Run Mode</Label>
          <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
        </div>
        <Button
          className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold transition py-5 rounded-lg hover:scale-[1.01] flex items-center justify-center gap-2"
          onClick={onGenerate} disabled={isGenerating || (!selectedTopic && !customTopic)}
        >
          {isGenerating ? "Drafting Post..." : <><Sparkles className="size-4 animate-pulse" /> Generate Draft</>}
        </Button>
      </CardContent>
    </Card>
  );
};
