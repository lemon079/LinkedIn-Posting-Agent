import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sliders, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ControlPanelProps {
  customTopic: string;
  context: string;
  domain?: string;
  isGenerating: boolean;
  setCustomTopic: (val: string) => void;
  setContext: (val: string) => void;
  setDomain?: (val: string) => void;
  onGenerate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  customTopic,
  domain = "auto",
  isGenerating,
  setCustomTopic,
  setContext,
  setDomain,
  onGenerate,
}) => {
  const [happened, setHappened] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Sync internal context inputs to parent state
  useEffect(() => {
    let combined = "";
    if (happened.trim()) combined += `What happened?\n${happened.trim()}\n\n`;
    if (takeaway.trim()) combined += `Takeaway:\n${takeaway.trim()}`;
    setContext(combined.trim());
  }, [happened, takeaway, setContext]);

  return (
    <Card className="bg-card border border-border shadow-sm rounded-2xl transition duration-300">
      <CardHeader
        onClick={() => {
          // Toggle open state on mobile/tablet viewports
          if (window.innerWidth < 1024) {
            setIsPanelOpen(!isPanelOpen);
          }
        }}
        className="border-b border-border pb-4 flex flex-row items-center justify-between cursor-pointer lg:cursor-default select-none"
      >
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-brand-blue" />
          <CardTitle className="text-sm font-bold tracking-tight text-foreground">Post Draft Settings</CardTitle>
        </div>
        {/* Chevron icon visible only on mobile/tablet viewports */}
        <div className="lg:hidden">
          {isPanelOpen ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out lg:grid-rows-[1fr]! ${isPanelOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <CardContent className="space-y-4 pt-4">
            {setDomain && (
              <div className="space-y-1.5">
                <Label htmlFor="domain-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Domain / Persona</Label>
                <Select value={domain} onValueChange={setDomain} disabled={isGenerating}>
                  <SelectTrigger id="domain-select" className="w-full bg-card border-border h-10 text-sm">
                    <SelectValue placeholder="Select domain..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="engineering">Engineering & CS</SelectItem>
                    <SelectItem value="hr">HR / People</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="general">General / Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
              <button
                type="button"
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full text-left"
              >
                {isContextExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                Additional Context
              </button>

              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isContextExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-3 pt-3 pb-1">
                    <div className="space-y-1.5">
                      <Textarea
                        id="context-happened"
                        className="w-full bg-card border-border h-20 resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-sm placeholder-muted-foreground text-foreground transition-colors duration-200"
                        placeholder="What happened? (e.g. Lost a deal, migrated a DB...)"
                        value={happened}
                        onChange={(e) => setHappened(e.target.value)}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Textarea
                        id="context-takeaway"
                        className="w-full bg-card border-border h-20 resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-sm placeholder-muted-foreground text-foreground transition-colors duration-200"
                        placeholder="What did you take away from it?"
                        value={takeaway}
                        onChange={(e) => setTakeaway(e.target.value)}
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border mt-2"></div>
            <Button
              className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold transition py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm duration-200"
              onClick={() => {
                onGenerate();
                if (window.innerWidth < 1024) {
                  setIsPanelOpen(false);
                }
              }}
              disabled={isGenerating || !customTopic}
            >
              {isGenerating ? "Drafting Post..." : <><Sparkles className="size-4 animate-pulse" /> Generate Draft</>}
            </Button>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};
