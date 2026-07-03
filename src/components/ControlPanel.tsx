import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sliders, Sparkles } from "lucide-react";

interface ControlPanelProps {
  customTopic: string;
  context: string;
  isGenerating: boolean;
  setCustomTopic: (val: string) => void;
  setContext: (val: string) => void;
  onGenerate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  customTopic,
  context,
  isGenerating,
  setCustomTopic,
  setContext,
  onGenerate,
}) => {
  return (
    <Card className="bg-card border border-border shadow-sm rounded-2xl transition duration-300">
      <CardHeader className="border-b border-border pb-4 flex flex-row items-center gap-2">
        <Sliders className="size-4 text-brand-blue" />
        <CardTitle className="text-sm font-bold tracking-tight text-foreground">Post Draft Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="custom-topic" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post Topic</Label>
          <Input
            id="custom-topic"
            placeholder="Enter post topic..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="context-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Context</Label>
          <Textarea
            id="context-input"
            className="w-full bg-card border-border h-30 max-h-30 overflow-y-auto resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-base md:text-sm placeholder-muted-foreground text-foreground transition-colors duration-200"
            placeholder="Paste code blocks, docs references, or tone limits..." value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
        <div className="border-t border-border mt-2"></div>
        <Button
          className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold transition py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm duration-200"
          onClick={onGenerate} disabled={isGenerating || !customTopic}
        >
          {isGenerating ? "Drafting Post..." : <><Sparkles className="size-4 animate-pulse" /> Generate Draft</>}
        </Button>
      </CardContent>
    </Card>
  );
};
