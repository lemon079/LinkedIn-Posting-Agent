"use client";

import React, { useState } from "react";
import { Check, Loader2, Circle, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownText } from "./markdown-text";

export interface TimelineStep {
  id?: string;
  title: string;
  output?: string;
  status?: "pending" | "running" | "completed" | "error";
  durationSeconds?: number;
}

export interface ElementsTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: TimelineStep[];
  isStreaming?: boolean;
  className?: string;
}

export const ElementsTimeline: React.FC<ElementsTimelineProps> = ({
  steps,
  isStreaming = false,
  className,
  ...props
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!steps || steps.length === 0) return null;

  const toggleStep = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div
      className={cn(
        "space-y-0 relative text-xs text-slate-700 dark:text-slate-300 select-none py-1",
        className
      )}
      {...props}
    >
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isCurrentRunning = isStreaming && isLast;
        const status = step.status || (isCurrentRunning ? "running" : "completed");
        const isExpanded = expandedIndex === idx || (isCurrentRunning && step.output);
        const hasContent = Boolean(step.output && step.output.trim().length > 0);
        const charCount = step.output ? step.output.length : 0;

        return (
          <div key={idx} className="relative flex gap-3 group">
            {/* Timeline Vertical Track Connector */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-3 top-6 bottom-0 w-px -ml-px transition-colors duration-300",
                  status === "completed"
                    ? "bg-slate-200 dark:bg-slate-800"
                    : "bg-slate-200 dark:bg-slate-800"
                )}
              />
            )}

            {/* Step Status Icon Node */}
            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card">
              {status === "running" ? (
                <div className="size-5 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                  <Loader2 className="size-3 animate-spin" />
                </div>
              ) : status === "completed" ? (
                <div className="size-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check className="size-3" />
                </div>
              ) : (
                <div className="size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Circle className="size-2 fill-current" />
                </div>
              )}
            </div>

            {/* Step Body */}
            <div className="flex-1 pb-4 min-w-0">
              <div
                onClick={() => hasContent && toggleStep(idx)}
                className={cn(
                  "flex items-center justify-between gap-2 py-0.5 rounded-md transition",
                  hasContent ? "cursor-pointer hover:bg-muted/40 px-1 -mx-1" : ""
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      "font-semibold text-xs truncate",
                      status === "running"
                        ? "text-brand-blue"
                        : "text-slate-800 dark:text-slate-200"
                    )}
                  >
                    {step.title}
                  </span>

                  {status === "running" && (
                    <span className="flex items-center gap-1 text-[10px] text-brand-blue font-medium">
                      <Sparkles className="size-2.5 animate-pulse" />
                      <span className="hidden sm:inline">Executing</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {charCount > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {charCount.toLocaleString()} chars
                    </span>
                  )}

                  {hasContent && (
                    <ChevronDown
                      className={cn(
                        "size-3 text-slate-400 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Expandable Step Output */}
              {hasContent && isExpanded && (
                <div className="mt-2 pl-2 border-l border-slate-200 dark:border-slate-800 animate-fade-in max-h-48 overflow-y-auto pr-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed custom-scrollbar">
                  <MarkdownText className="text-xs">{step.output!}</MarkdownText>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
