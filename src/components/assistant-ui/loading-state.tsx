"use client";

import React from "react";
import { Sparkles, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AssistantLoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  subMessage?: string;
  className?: string;
}

export const AssistantLoadingState: React.FC<AssistantLoadingStateProps> = ({
  message = "Drafting your LinkedIn post...",
  subMessage = "Structuring hook, storytelling body, and call-to-action",
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "space-y-4 p-5 rounded-2xl border border-border bg-card/60 animate-fade-in text-slate-800 dark:text-slate-200 select-none",
        className
      )}
      {...props}
    >
      {/* Top Header Placeholder */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center animate-pulse">
            <Bot className="size-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{message}</span>
              <Sparkles className="size-3 text-brand-blue animate-spin" />
            </div>
            <p className="text-[11px] text-muted-foreground">{subMessage}</p>
          </div>
        </div>

        {/* Pulse indicator badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-blue/5 border border-brand-blue/15 text-[10px] text-brand-blue font-medium">
          <span className="size-1.5 rounded-full bg-brand-blue animate-ping" />
          <span>Generating</span>
        </div>
      </div>

      {/* Skeleton Shimmer Wave Lines */}
      <div className="space-y-2.5 pt-2">
        <div className="h-4 bg-muted/80 rounded-md w-3/4 animate-pulse animation-duration-[1.5s]" />
        <div className="h-4 bg-muted/60 rounded-md w-full animate-pulse animation-duration-[1.5s] [animation-delay:0.2s]" />
        <div className="h-4 bg-muted/60 rounded-md w-5/6 animate-pulse animation-duration-[1.5s] [animation-delay:0.4s]" />
        <div className="h-4 bg-muted/40 rounded-md w-2/3 animate-pulse animation-duration-[1.5s] [animation-delay:0.6s]" />
      </div>

      {/* Attachment area placeholder */}
      <div className="pt-2 flex items-center gap-2">
        <div className="h-7 w-28 bg-muted/40 rounded-lg animate-pulse" />
        <div className="h-7 w-20 bg-muted/30 rounded-lg animate-pulse [animation-delay:0.3s]" />
      </div>
    </div>
  );
};
