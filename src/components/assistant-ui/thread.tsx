"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Eye, Send, Edit3, Bot, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LinkedInFeed } from "@/components/LinkedInFeed";
import { AssistantReasoning } from "./reasoning";
import { AssistantAttachments, type AssistantAttachmentItem } from "./attachment";
import { ThinkingIndicator } from "./thinking-indicator";
import { AssistantLoadingState } from "./loading-state";
import { AssistantErrorState } from "./error-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AssistantThreadProps {
  draftText: string | null;
  streamingText: string | null;
  isGenerating: boolean;
  onStreamingComplete?: () => void;
  isPublishing: boolean;
  selectedFiles: AssistantAttachmentItem[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<AssistantAttachmentItem[]>>;
  isUploading: boolean;
  onUploadFile: (file: File) => void;
  onChange: (value: string) => void;
  onPublish: () => void;
  onDiscard?: () => void;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  error?: string | Error | null;
  onDismissError?: () => void;
  reasoningSteps?: Array<{ title: string; output: string }>;
  defaultMode?: "preview" | "edit";
  className?: string;
}

export const AssistantThread: React.FC<AssistantThreadProps> = ({
  draftText,
  streamingText,
  isGenerating,
  onStreamingComplete,
  isPublishing,
  selectedFiles,
  setSelectedFiles,
  isUploading,
  onUploadFile,
  onChange,
  onPublish,
  onDiscard,
  onRetry,
  onOpenSettings,
  error,
  onDismissError,
  reasoningSteps,
  defaultMode = "preview",
  className,
}) => {
  const [viewMode, setViewMode] = useState<"preview" | "edit">(defaultMode);
  const [copied, setCopied] = useState(false);
  const [streamedLength, setStreamedLength] = useState(0);
  const [prevStreamingText, setPrevStreamingText] = useState<string | null>(null);

  const isStreaming = streamingText !== null;

  if (streamingText !== prevStreamingText) {
    setPrevStreamingText(streamingText);
    setStreamedLength(0);
  }

  const totalLength = streamingText ? streamingText.length : 0;

  useEffect(() => {
    if (!isStreaming || totalLength === 0) return;

    const interval = setInterval(() => {
      setStreamedLength((prev) => {
        if (prev < totalLength) {
          return prev + 1;
        } else {
          clearInterval(interval);
          if (onStreamingComplete) {
            setTimeout(onStreamingComplete, 300);
          }
          return prev;
        }
      });
    }, 6);

    return () => clearInterval(interval);
  }, [isStreaming, totalLength, onStreamingComplete]);

  const currentText = draftText ? draftText : (streamingText ? streamingText.slice(0, streamedLength) : "");
  const charCount = currentText.length;
  const pct = Math.min((charCount / 3000) * 100, 100);
  const strokeDashoffset = 100 - pct;

  const colorClass =
    charCount > 3000
      ? "text-red-600 stroke-red-600"
      : charCount > 2800
        ? "text-yellow-600 stroke-yellow-600"
        : "text-brand-blue stroke-brand-blue";

  const handleCopy = async () => {
    if (!currentText) return;
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      toast.success("Draft copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isControlsDisabled = isPublishing || isUploading || isGenerating;

  return (
    <div className={cn("space-y-4 bg-card border border-border p-5 rounded-2xl shadow-level-1", className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center">
            <Bot className="size-4" />
          </div>
          <div>
            <Label htmlFor="draft-editor" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              AI Draft Workspace
            </Label>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition cursor-pointer",
                viewMode === "preview"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="View formatted markdown preview"
            >
              <Eye className="size-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition cursor-pointer",
                viewMode === "edit"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Edit raw draft content"
            >
              <Edit3 className="size-3.5" />
              <span>Edit</span>
            </button>
          </div>

          {/* Live Thinking Indicator */}
          {isGenerating && (
            <ThinkingIndicator
              isThinking={true}
              statusText={isPublishing ? "Publishing to LinkedIn" : "Drafting post"}
              variant="pill"
            />
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Character counter */}
          <div
            className="flex items-center gap-2 text-xs"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Character count: ${charCount} out of 3000`}
          >
            <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle
                className="stroke-outline-variant/40"
                cx="18"
                cy="18"
                r="16"
                fill="none"
                strokeWidth="3.5"
              />
              <circle
                className={cn("transition-all duration-300", colorClass)}
                cx="18"
                cy="18"
                r="16"
                fill="none"
                strokeWidth="3.5"
                strokeDasharray="100"
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <span
              className={cn(
                "font-mono font-medium",
                charCount > 3000 ? "text-red-600" : "text-slate-500"
              )}
            >
              {charCount}/3000
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Copy Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs font-semibold border-outline-variant hover:bg-surface-container gap-1.5 cursor-pointer"
            onClick={handleCopy}
            disabled={charCount === 0 || isGenerating}
            title="Copy draft to clipboard"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </Button>

          {/* Discard / Clear Button */}
          {onDiscard && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-semibold border-outline-variant hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 hover:border-red-200 gap-1.5 cursor-pointer text-slate-500 transition"
              onClick={() => {
                if (window.confirm("Are you sure you want to discard this draft?")) {
                  onDiscard();
                  toast.success("Draft discarded");
                }
              }}
              disabled={isControlsDisabled || (charCount === 0 && (!selectedFiles || selectedFiles.length === 0))}
              title="Discard draft and clear workspace"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Discard</span>
            </Button>
          )}

          {/* LinkedIn Publish Button */}
          <Button
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-brand-blue hover:bg-brand-blue-hover text-white gap-1.5 shadow-sm duration-200 cursor-pointer disabled:opacity-50"
            onClick={onPublish}
            disabled={isControlsDisabled || charCount > 3000 || charCount === 0}
            aria-busy={isPublishing ? "true" : "false"}
          >
            {isPublishing ? (
              <>Publishing...</>
            ) : isUploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Send className="size-3.5" /> Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Assistant UI Error State */}
      {error && (
        <AssistantErrorState
          error={error}
          onRetry={onRetry}
          onOpenSettings={onOpenSettings}
          onDismiss={onDismissError}
        />
      )}

      {/* Assistant UI Reasoning Section with ElementsTimeline */}
      {reasoningSteps && reasoningSteps.length > 0 && (
        <AssistantReasoning
          reasoningSteps={reasoningSteps}
          isStreaming={isGenerating && (!draftText && !streamingText)}
        />
      )}

      {/* Workspace Content: Loading State, Preview, or Edit */}
      {isGenerating && !currentText ? (
        <AssistantLoadingState />
      ) : viewMode === "preview" ? (
        <div
          className="w-full bg-card border border-border min-h-65 max-h-96 overflow-y-auto rounded-xl p-4 transition-colors duration-200 focus-within:ring-2 focus-within:ring-brand-blue/20"
          tabIndex={0}
          aria-label="Formatted Post Preview in Markdown"
        >
          {currentText ? (
            <LinkedInFeed draftText={currentText} selectedFiles={selectedFiles} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Your AI generated draft will appear here...</p>
          )}
        </div>
      ) : (
        <Textarea
          id="draft-editor"
          className="w-full bg-card border-border h-65 max-h-65 overflow-y-auto resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-base md:text-sm leading-relaxed text-slate-900 dark:text-slate-100 transition-colors duration-200"
          value={currentText}
          onChange={(e) => onChange(e.target.value)}
          disabled={isPublishing}
          placeholder="Your AI generated draft will appear here..."
          aria-label="Interactive Draft Editor"
          aria-invalid={charCount > 3000 ? "true" : "false"}
        />
      )}

      {/* Assistant UI Attachments Controls */}
      <AssistantAttachments
        files={selectedFiles}
        onRemoveFile={handleRemoveFile}
        onUploadFile={onUploadFile}
        isUploading={isUploading}
        disabled={isControlsDisabled}
      />
    </div>
  );
};
