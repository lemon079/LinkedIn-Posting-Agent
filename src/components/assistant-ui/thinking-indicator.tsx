"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThinkingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  isThinking?: boolean;
  statusText?: string;
  startTime?: number;
  variant?: "pill" | "inline" | "card";
  className?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  isThinking = true,
  statusText = "Thinking",
  startTime,
  variant = "pill",
  className,
  ...props
}) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isThinking) {
      return;
    }

    const start = startTime || Date.now();
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 500);

    return () => {
      clearInterval(interval);
      setSeconds(0);
    };
  }, [isThinking, startTime]);

  if (!isThinking) return null;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-xs font-medium text-brand-blue animate-fade-in select-none",
          className
        )}
        {...props}
      >
        <Sparkles className="size-3.5 animate-pulse text-brand-blue" />
        <span>{statusText}</span>
        <span className="flex items-center gap-0.5">
          <span className="size-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
          <span className="size-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
          <span className="size-1 rounded-full bg-brand-blue animate-bounce" />
        </span>
        {seconds > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            ({seconds}s)
          </span>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 text-slate-700 dark:text-slate-200 text-xs animate-fade-in-up",
          className
        )}
        {...props}
      >
        <div className="size-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
          <Brain className="size-4 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-semibold text-brand-blue">
            <span>{statusText}</span>
            <span className="flex items-center gap-0.5 ml-1">
              <span className="size-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1 rounded-full bg-brand-blue animate-bounce" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Analyzing context and crafting high-impact content...
          </p>
        </div>
        {seconds > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground px-2 py-0.5 bg-card/60 rounded-full border border-border">
            {seconds}s
          </span>
        )}
      </div>
    );
  }

  // Default "pill" variant
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-blue/20 bg-brand-blue/5 text-xs text-brand-blue font-medium shadow-xs animate-fade-in select-none",
        className
      )}
      {...props}
    >
      <Sparkles className="size-3 text-brand-blue animate-pulse" />
      <span>{statusText}</span>
      <span className="flex items-center gap-0.5">
        <span className="size-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
        <span className="size-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
        <span className="size-1 rounded-full bg-brand-blue animate-bounce" />
      </span>
      {seconds > 0 && (
        <span className="font-mono text-[10px] text-brand-blue/70 ml-0.5">
          {seconds}s
        </span>
      )}
    </div>
  );
};
