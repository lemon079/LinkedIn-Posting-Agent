"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Sliders, ChevronDown, ChevronRight, CornerDownLeft, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AssistantComposerProps {
  customTopic: string;
  context: string;
  domain?: string;
  isGenerating: boolean;
  setCustomTopic: (val: string) => void;
  setContext: (val: string) => void;
  setDomain?: (val: string) => void;
  onGenerate: () => void;
  onCancel?: () => void;
  className?: string;
}

export const AssistantComposer: React.FC<AssistantComposerProps> = ({
  customTopic,
  context,
  domain = "auto",
  isGenerating,
  setCustomTopic,
  setContext,
  setDomain,
  onGenerate,
  onCancel,
  className,
}) => {
  const [happened, setHappened] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Sync happened and takeaway to context string
  useEffect(() => {
    let combined = "";
    if (happened.trim()) combined += `What happened?\n${happened.trim()}\n\n`;
    if (takeaway.trim()) combined += `Takeaway:\n${takeaway.trim()}`;
    setContext(combined.trim());
  }, [happened, takeaway, setContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && customTopic.trim()) {
        onGenerate();
      }
    }
  };

  return (
    <div
      className={cn(
        "bg-card border border-border shadow-level-1 rounded-2xl transition duration-300 overflow-hidden",
        className
      )}
    >
      <div
        onClick={() => {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsPanelOpen(!isPanelOpen);
          }
        }}
        className="border-b border-border px-5 py-4 flex flex-row items-center justify-between cursor-pointer lg:cursor-default select-none bg-card"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue">
            <Sliders className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Post Generation Controls
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Configure parameters and prompt your AI agent
            </p>
          </div>
        </div>
        <div className="lg:hidden text-muted-foreground">
          {isPanelOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out lg:grid-rows-[1fr]!",
          isPanelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-5 space-y-4">
            {setDomain && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="domain-select"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Domain / Persona
                </Label>
                <Select value={domain} onValueChange={setDomain} disabled={isGenerating}>
                  <SelectTrigger
                    id="domain-select"
                    className="w-full bg-card border-border h-10 text-sm rounded-xl"
                  >
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
              <Label
                htmlFor="custom-topic"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
              >
                <span>Post Topic</span>
                <span className="text-[10px] text-muted-foreground font-normal">Required</span>
              </Label>
              <div className="relative">
                <Input
                  id="custom-topic"
                  placeholder="Enter topic or prompt (e.g., Lessons learned building high-scale agents)..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isGenerating}
                  className="pr-10 rounded-xl text-sm"
                />
                {customTopic.trim().length > 0 && !isGenerating && (
                  <button
                    type="button"
                    onClick={onGenerate}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue transition p-1 cursor-pointer"
                    title="Generate (Enter)"
                  >
                    <CornerDownLeft className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full text-left"
              >
                {isContextExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                Additional Context & Story Details
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-in-out",
                  isContextExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-3 pt-3 pb-1">
                    <div className="space-y-1.5">
                      <Textarea
                        id="context-happened"
                        className="w-full bg-card border-border h-20 resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-sm placeholder-muted-foreground text-foreground transition-colors duration-200"
                        placeholder="What happened? (e.g. Migrated databases with zero downtime, lost a major lead...)"
                        value={happened}
                        onChange={(e) => setHappened(e.target.value)}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Textarea
                        id="context-takeaway"
                        className="w-full bg-card border-border h-20 resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-sm placeholder-muted-foreground text-foreground transition-colors duration-200"
                        placeholder="What did you take away or want your audience to learn?"
                        value={takeaway}
                        onChange={(e) => setTakeaway(e.target.value)}
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-2">
              <Button
                className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold transition py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm duration-200 cursor-pointer disabled:opacity-50"
                onClick={() => {
                  onGenerate();
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setIsPanelOpen(false);
                  }
                }}
                disabled={isGenerating || !customTopic.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Drafting Post...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 animate-pulse" />
                    <span>Generate Draft</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
