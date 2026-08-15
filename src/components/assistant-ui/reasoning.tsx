"use client";

import React, { createContext, useContext, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownText } from "./markdown-text";
import { ElementsTimeline, type TimelineStep } from "./elements-timeline";

interface ReasoningContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isStreaming: boolean;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export interface ReasoningRootProps extends React.HTMLAttributes<HTMLDivElement> {
  streaming?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const ReasoningRoot: React.FC<ReasoningRootProps> = ({
  streaming = false,
  defaultOpen,
  className,
  children,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? streaming);
  const [prevStreaming, setPrevStreaming] = useState(streaming);

  if (streaming !== prevStreaming) {
    setPrevStreaming(streaming);
    if (streaming) {
      setIsOpen(true);
    }
  }

  return (
    <ReasoningContext.Provider value={{ isOpen, setIsOpen, isStreaming: streaming }}>
      <div
        className={cn(
          "w-full text-xs text-muted-foreground transition-all duration-200",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ReasoningContext.Provider>
  );
};

export interface ReasoningTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  totalChars?: number;
  previewText?: string;
}

export const ReasoningTrigger: React.FC<ReasoningTriggerProps> = ({
  active,
  totalChars,
  previewText,
  className,
  children,
  ...props
}) => {
  const context = useContext(ReasoningContext);
  const isOpen = context ? context.isOpen : false;
  const isStreaming = active ?? (context ? context.isStreaming : false);

  return (
    <div className="flex items-center justify-between gap-2 py-1 select-none">
      <button
        type="button"
        onClick={() => context?.setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="reasoning-content"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-md py-0.5 group",
          className
        )}
        {...props}
      >
        <ChevronDown
          className={cn(
            "size-3.5 text-slate-400 transition-transform duration-200 ease-out group-hover:text-slate-600 dark:group-hover:text-slate-300",
            isOpen && "rotate-180"
          )}
        />
        <span className="flex items-center gap-1">
          {isStreaming ? (
            <>
              <Sparkles className="size-3 text-brand-blue animate-pulse" />
              <span className="text-brand-blue font-semibold">Thinking...</span>
            </>
          ) : (
            <span>{children || (isOpen ? "Hide thought timeline" : "Agent thought timeline")}</span>
          )}
        </span>

        {!isOpen && previewText && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-72 opacity-80 italic font-normal ml-1 hidden sm:inline">
            — {previewText}
          </span>
        )}
      </button>

      {totalChars !== undefined && totalChars > 0 && (
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 px-2 py-0.5 bg-slate-100/70 dark:bg-slate-800/70 rounded-full shrink-0">
          {totalChars.toLocaleString()} chars
        </span>
      )}
    </div>
  );
};

export interface ReasoningContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ReasoningContent: React.FC<ReasoningContentProps> = ({
  className,
  children,
  ...props
}) => {
  const context = useContext(ReasoningContext);
  const isOpen = context ? context.isOpen : true;

  return (
    <div
      id="reasoning-content"
      className={cn(
        "grid transition-all duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100 mt-1.5" : "grid-rows-[0fr] opacity-0"
      )}
      {...props}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "pl-1 my-1 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent text-xs leading-relaxed text-slate-600 dark:text-slate-400",
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export interface ReasoningTextProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  children?: React.ReactNode;
}

export const ReasoningText: React.FC<ReasoningTextProps> = ({
  text,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans",
        className
      )}
      {...props}
    >
      {text ? <MarkdownText className="text-xs">{text}</MarkdownText> : children}
    </div>
  );
};

/**
 * Minimalist Assistant UI reasoning component featuring ElementsTimeline
 */
export interface AssistantReasoningProps {
  reasoningSteps?: Array<{ title: string; output: string }>;
  isStreaming?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export const AssistantReasoning: React.FC<AssistantReasoningProps> = ({
  reasoningSteps,
  isStreaming = false,
  defaultOpen,
  className,
}) => {
  if (!reasoningSteps || reasoningSteps.length === 0) return null;

  const totalChars = reasoningSteps.reduce((acc, step) => acc + step.output.length, 0);
  const latestStep = reasoningSteps[reasoningSteps.length - 1];
  const previewText = latestStep?.output
    ? latestStep.output.substring(0, 50).replace(/\n/g, " ") +
      (latestStep.output.length > 50 ? "..." : "")
    : undefined;

  const timelineSteps: TimelineStep[] = reasoningSteps.map((step, idx) => ({
    id: `step-${idx}`,
    title: step.title,
    output: step.output,
    status: isStreaming && idx === reasoningSteps.length - 1 ? "running" : "completed",
  }));

  return (
    <ReasoningRoot
      streaming={isStreaming}
      defaultOpen={defaultOpen}
      className={cn("w-full mb-3", className)}
    >
      <ReasoningTrigger
        active={isStreaming}
        totalChars={totalChars}
        previewText={previewText}
      />
      <ReasoningContent>
        <ElementsTimeline steps={timelineSteps} isStreaming={isStreaming} />
      </ReasoningContent>
    </ReasoningRoot>
  );
};
