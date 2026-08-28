"use client";

import React from "react";
import { Check, Loader2, Circle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
  if (!steps || steps.length === 0) return null;

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

        return (
          <div key={idx} className="relative flex items-center gap-3 py-1.5">
            {/* Timeline Vertical Track Connector */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-3 top-5 -bottom-1.5 w-px -ml-px transition-colors duration-300",
                  status === "completed"
                    ? "bg-emerald-200 dark:bg-emerald-950/60"
                    : "bg-slate-200 dark:bg-slate-800"
                )}
              />
            )}

            {/* Step Status Icon Node */}
            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card">
              {status === "running" ? (
                <div className="size-5 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue ring-2 ring-brand-blue/20">
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

            {/* Step Heading Only — No Internal Reasoning Text */}
            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
              <span
                className={cn(
                  "font-medium text-xs truncate transition-colors",
                  status === "running"
                    ? "text-brand-blue font-semibold"
                    : status === "completed"
                      ? "text-slate-800 dark:text-slate-200"
                      : "text-slate-500 dark:text-slate-400"
                )}
              >
                {step.title}
              </span>

              {status === "running" && (
                <span className="flex items-center gap-1 text-[10px] text-brand-blue font-medium shrink-0 bg-brand-blue/10 px-2 py-0.5 rounded-full animate-pulse">
                  <Sparkles className="size-2.5" />
                  <span>Processing</span>
                </span>
              )}

              {status === "completed" && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                  Done
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
