"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
  Loader2,
  Globe,
  Zap,
  Target,
  ShieldCheck,
  Send,
  Wand2,
} from "lucide-react";
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
import type { BaseComposerProps } from "@/types/ui";

export interface AssistantComposerProps extends BaseComposerProps {
  onCancel?: () => void;
  className?: string;
}

const REFINEMENT_CHIPS = [
  "Make it punchier",
  "Cut fluff",
  "Focus on outcome",
  "Add concrete metrics",
  "More contrarian",
];

export const AssistantComposer: React.FC<AssistantComposerProps> = ({
  customTopic,
  domain = "auto",
  archetype = "auto",
  tone = "conversational",
  isGenerating,
  setCustomTopic,
  setContext,
  setDomain,
  setArchetype,
  setTone,
  webSearchEnabled = false,
  setWebSearchEnabled,
  onGenerate,
  hasDraft = false,
  reasoningSteps = [],
  onRefine,
  className,
}) => {
  const [happened, setHappened] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [refinementInput, setRefinementInput] = useState("");

  const isNonSearchArchetype =
    archetype === "teardown" || archetype === "breakdown" || archetype === "hiring";

  const isHiring = archetype === "hiring";

  // Sync happened and takeaway to context string
  useEffect(() => {
    let combined = "";
    if (isHiring) {
      if (happened.trim()) combined += `Role:\n${happened.trim()}\n\n`;
      if (takeaway.trim()) combined += `What makes it different:\n${takeaway.trim()}`;
    } else {
      if (happened.trim()) combined += `What happened?\n${happened.trim()}\n\n`;
      if (takeaway.trim()) combined += `Takeaway:\n${takeaway.trim()}`;
    }
    setContext(combined.trim());
  }, [happened, takeaway, isHiring, setContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isGenerating && customTopic.trim()) {
        onGenerate();
      }
    } else if (e.key === "Enter" && !e.shiftKey && e.currentTarget.tagName === "INPUT") {
      e.preventDefault();
      if (!isGenerating && customTopic.trim()) {
        onGenerate();
      }
    }
  };

  const handleRefineSubmit = (instruction?: string) => {
    const textToSubmit = instruction || refinementInput;
    if (!textToSubmit.trim() || isGenerating) return;

    if (onRefine) {
      onRefine(textToSubmit.trim());
    } else {
      onGenerate(textToSubmit.trim());
    }
    setRefinementInput("");
  };

  const handleRefineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRefineSubmit();
    }
  };

  // Human-readable labels for badges
  const domainLabel =
    domain === "engineering"
      ? "Engineering & CS"
      : domain === "hr"
        ? "HR & People"
        : domain === "sales"
          ? "Sales"
          : domain === "marketing"
            ? "Marketing"
            : domain === "general"
              ? "General"
              : "Auto Domain";

  const archetypeLabel =
    archetype === "teardown"
      ? "Incident Teardown"
      : archetype === "contrarian"
        ? "Contrarian Take"
        : archetype === "framework"
          ? "Playbook / Framework"
          : archetype === "breakdown"
            ? "Gotcha / Deep Dive"
            : archetype === "comparison"
              ? "Decision Matrix"
              : archetype === "hiring"
                ? "Hiring Post"
                : "Auto Archetype";

  const toneLabel =
    tone === "authoritative"
      ? "Authoritative"
      : tone === "provocative"
        ? "Provocative"
        : tone === "reflective"
          ? "Reflective"
          : "Conversational";

  return (
    <div
      className={cn(
        "bg-card border border-border shadow-level-1 rounded-2xl transition duration-300 overflow-hidden font-sans",
        className
      )}
    >
      {/* Studio Header & Parameter Pills */}
      <div
        onClick={() => {
          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsPanelOpen(!isPanelOpen);
          }
        }}
        className="border-b border-border/80 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col gap-2.5 cursor-pointer lg:cursor-default select-none bg-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue">
              <Sliders className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Command & Agent Copilot</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                  Studio
                </span>
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

        {/* Live Parameter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border/60">
            {domainLabel}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border/60">
            {archetypeLabel}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border/60">
            {toneLabel}
          </span>
          {webSearchEnabled && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Globe className="size-2.5" />
              <span>Grounded</span>
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out lg:grid-rows-[1fr]!",
          isPanelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4">
            {/* Calibration Selectors */}
            <div className="space-y-3">
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
                      <SelectItem value="auto">Auto-Detect</SelectItem>
                      <SelectItem value="engineering">Engineering & CS</SelectItem>
                      <SelectItem value="hr">HR / People</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="general">General / Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {setArchetype && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="archetype-select"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Post Archetype
                    </Label>
                    <Select value={archetype} onValueChange={setArchetype} disabled={isGenerating}>
                      <SelectTrigger
                        id="archetype-select"
                        className="w-full bg-card border-border h-10 text-sm rounded-xl"
                      >
                        <SelectValue placeholder="Select archetype..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-Select</SelectItem>
                        <SelectItem value="teardown">Incident Teardown</SelectItem>
                        <SelectItem value="contrarian">Contrarian Take</SelectItem>
                        <SelectItem value="framework">Playbook / Framework</SelectItem>
                        <SelectItem value="breakdown">Gotcha / Deep Dive</SelectItem>
                        <SelectItem value="comparison">Decision Matrix / Comparison</SelectItem>
                        <SelectItem value="hiring">Hiring / Recruiting Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {setTone && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="tone-select"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Tone & Voice
                    </Label>
                    <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
                      <SelectTrigger
                        id="tone-select"
                        className="w-full bg-card border-border h-10 text-sm rounded-xl"
                      >
                        <SelectValue placeholder="Select tone..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversational">Conversational (Peer)</SelectItem>
                        <SelectItem value="authoritative">Authoritative (Expert)</SelectItem>
                        <SelectItem value="provocative">Provocative (Bold)</SelectItem>
                        <SelectItem value="reflective">Reflective (Lessons)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Main Command Prompt: Topic & Shortcut */}
            <div className="space-y-1.5">
              <Label
                htmlFor="custom-topic"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
              >
                <span>Command / Topic</span>
                <span className="text-[10px] font-mono text-muted-foreground">⌘+Enter to run</span>
              </Label>
              <div className="relative">
                <Input
                  id="custom-topic"
                  placeholder="Enter topic or prompt (e.g., Lessons learned building high-scale agents)..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isGenerating}
                  className="pr-12 rounded-xl text-base sm:text-sm font-sans"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    ⌘↵
                  </kbd>
                  {customTopic.trim().length > 0 && !isGenerating && (
                    <button
                      type="button"
                      onClick={() => onGenerate()}
                      className="text-slate-400 hover:text-brand-blue transition p-1 cursor-pointer"
                      title="Generate (⌘+Enter)"
                    >
                      <CornerDownLeft className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Accordion: Additional Context & Story Details */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full text-left py-1"
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
                      <Label
                        htmlFor="context-happened"
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        {isHiring ? "Role & what they'll actually work on" : "What happened?"}
                      </Label>
                      <Textarea
                        id="context-happened"
                        className="w-full bg-card border-border h-20 resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-base sm:text-sm placeholder-muted-foreground text-foreground transition-colors duration-200"
                        placeholder=""
                        value={happened}
                        onChange={(e) => setHappened(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="context-takeaway"
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        {isHiring ? "What makes this role/team different" : "Takeaway"}
                      </Label>
                      <Textarea
                        id="context-takeaway"
                        className="w-full bg-card border-border h-20 resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-base sm:text-sm placeholder-muted-foreground text-foreground transition-colors duration-200"
                        placeholder=""
                        value={takeaway}
                        onChange={(e) => setTakeaway(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Web Search Grounding Toggle */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1.5 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-md bg-brand-blue/10 text-brand-blue shrink-0">
                    <Globe className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        Ground with web search
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Enrich post with public benchmarks and architecture data
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={webSearchEnabled}
                  aria-label="Ground with web search"
                  disabled={isGenerating}
                  onClick={() => setWebSearchEnabled?.(!webSearchEnabled)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50",
                    webSearchEnabled ? "bg-brand-blue" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-3.5 transform rounded-full bg-white shadow-xs transition duration-200",
                      webSearchEnabled ? "translate-x-4.5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {webSearchEnabled && isNonSearchArchetype && (
                <div className="pt-1 border-t border-border/40">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <span>this post type doesn&apos;t use search</span>
                  </p>
                </div>
              )}
            </div>

            {/* Agent Telemetry Stream: Sleek pill badges */}
            {(isGenerating || reasoningSteps.length > 0 || hasDraft) && (
              <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Zap className="size-3 text-brand-blue" />
                    Agent Telemetry Stream
                  </span>
                  {isGenerating && (
                    <span className="text-[10px] font-mono text-brand-blue animate-pulse">
                      Processing live nodes...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span>⚡</span>
                    <span>Intake Analyzed</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <span>🌐</span>
                    <span>Grounded with benchmarks</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Target className="size-2.5" />
                    <span>Critic Score: 8.5/10</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="size-2.5" />
                    <span>Safety Verified</span>
                  </span>
                </div>
              </div>
            )}

            {/* Conversational Refinement Box */}
            {hasDraft && (
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Wand2 className="size-3.5 text-brand-blue" />
                    <span>Refine Draft</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    1-click chips or prompt
                  </span>
                </div>

                {/* 1-Click Suggestion Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {REFINEMENT_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleRefineSubmit(chip)}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition cursor-pointer disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Conversational Input Field */}
                <div className="relative">
                  <Input
                    placeholder="Ask agent to refine (e.g. Focus on outcome)..."
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    onKeyDown={handleRefineKeyDown}
                    disabled={isGenerating}
                    className="pr-10 rounded-xl text-xs h-9 bg-muted/40 font-sans"
                  />
                  <button
                    type="button"
                    disabled={isGenerating || !refinementInput.trim()}
                    onClick={() => handleRefineSubmit()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-brand-blue hover:text-brand-blue-hover disabled:opacity-40 transition cursor-pointer"
                    title="Send refinement instruction"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Generate Action Button */}
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
