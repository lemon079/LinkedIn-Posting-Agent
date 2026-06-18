import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ControlPanelProps {
  topics: string[];
  selectedTopic: string;
  customTopic: string;
  context: string;
  dryRun: boolean;
  isGenerating: boolean;
  setSelectedTopic: (val: string) => void;
  setCustomTopic: (val: string) => void;
  setContext: (val: string) => void;
  setDryRun: (val: boolean) => void;
  onGenerate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  topics,
  selectedTopic,
  customTopic,
  context,
  dryRun,
  isGenerating,
  setSelectedTopic,
  setCustomTopic,
  setContext,
  setDryRun,
  onGenerate,
}) => {
  return (
    <Card className="bg-card-bg border-border-color">
      <CardHeader>
        <CardTitle className="text-lg">Dashboard Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="topic-select" className="block text-sm font-medium mb-1.5">Default Genres</Label>
          <Select onValueChange={(val) => setSelectedTopic(val === "custom" ? "" : val)}>
            <SelectTrigger id="topic-select" className="w-full bg-bg-secondary border-border-color">
              <SelectValue placeholder="Select topic category" />
            </SelectTrigger>
            <SelectContent className="bg-bg-secondary border-border-color text-text-primary">
              {topics.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
              <SelectItem value="custom">Custom (Specify Below)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="custom-topic" className="block text-sm font-medium mb-1.5">Custom Topic</Label>
          <input
            id="custom-topic"
            className="w-full bg-bg-secondary border border-border-color text-text-primary p-3 rounded-md focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
            placeholder="Enter custom post topic"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="context-input" className="block text-sm font-medium mb-1.5">Additional Context</Label>
          <Textarea
            id="context-input"
            className="w-full bg-bg-secondary border-border-color min-h-[100px]"
            placeholder="Paste references, code blocks, or tone constraints"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="dry-run" className="text-sm font-medium cursor-pointer">Dry-Run Publishing</Label>
          <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
        </div>
        <Button
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold transition"
          onClick={onGenerate}
          disabled={isGenerating || (!selectedTopic && !customTopic)}
        >
          {isGenerating ? "Drafting Post..." : "🪄 Generate Draft"}
        </Button>
      </CardContent>
    </Card>
  );
};
