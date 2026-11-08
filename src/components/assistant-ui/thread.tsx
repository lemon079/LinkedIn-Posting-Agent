"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Eye,
  Send,
  Edit3,
  Bot,
  Clock,
  BarChart3,
  Flame,
  Wrench,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LinkedInFeed } from "@/components/LinkedInFeed";
import { AssistantReasoning } from "./reasoning";
import { AssistantAttachments } from "./attachment";
import { WebSearch } from "./web-search";
import { FeedbackToolbar } from "./feedback-toolbar";
import { ErrorState } from "./error-state";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { BaseThreadEditorProps } from "@/types/ui";

export interface AssistantThreadProps extends BaseThreadEditorProps {
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
  error,
  reasoningSteps,
  alternativeHooks = [],
  onApplyHook,
  webSearchResults,
  isSearchingWeb,
  webSearchQuery,
  webSearchSkippedReason,
  user,
  runId,
  defaultMode = "preview",
  className,
  onNewPost,
}) => {
  const [viewMode, setViewMode] = useState<"preview" | "edit">(defaultMode);
  const [isRetrying, setIsRetrying] = useState(false);
  const [prevIsGenerating, setPrevIsGenerating] = useState(isGenerating);
  const [lastErrorParsed, setLastErrorParsed] = useState(() => (error ? parseApiError(error) : null));
  const [prevError, setPrevError] = useState(error);
  const [streamingSlice, setStreamingSlice] = useState(0);

  // Scroll management
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUp = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    isUserScrolledUp.current = !isNearBottom;
  }, []);

  // Sync state transitions during render
  if (prevIsGenerating !== isGenerating) {
    setPrevIsGenerating(isGenerating);
    if (isGenerating) {
      setStreamingSlice(0);
      setViewMode("preview");
    } else if (isRetrying) {
      setIsRetrying(false);
    }
  }

  // Reset auto-scroll flag when generation starts
  useEffect(() => {
    if (isGenerating) {
      isUserScrolledUp.current = false;
    }
  }, [isGenerating]);

  if (prevError !== error) {
    setPrevError(error);
    if (error) {
      setLastErrorParsed(parseApiError(error));
    }
  }

  // Derived effective view mode: always lock to preview while generating
  const effectiveViewMode = isGenerating ? "preview" : viewMode;

  // Character-by-character live streaming output
  const targetText = draftText !== null && draftText !== undefined ? draftText : (streamingText ?? "");

  useEffect(() => {
    if (!isGenerating || !targetText) return;

    let frameId: number;
    const streamChars = () => {
      setStreamingSlice((prev) => {
        if (prev >= targetText.length) {
          return targetText.length;
        }
        const delta = targetText.length - prev;
        const step = delta > 60 ? 8 : delta > 20 ? 4 : delta > 5 ? 2 : 1;
        return Math.min(targetText.length, prev + step);
      });
      frameId = requestAnimationFrame(streamChars);
    };

    frameId = requestAnimationFrame(streamChars);

    return () => cancelAnimationFrame(frameId);
  }, [isGenerating, targetText]);

  // Complete streaming callback when generation finishes
  useEffect(() => {
    if (!isGenerating && streamingText && onStreamingComplete) {
      onStreamingComplete();
    }
  }, [isGenerating, streamingText, onStreamingComplete]);

  const currentText = isGenerating ? targetText.slice(0, streamingSlice) : targetText;
  const charCount = currentText.length;

  // Auto-scroll to bottom as new text streams in (unless user scrolled up)
  useEffect(() => {
    if (isGenerating && !isUserScrolledUp.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [isGenerating, currentText]);

  const parsedError = error ? parseApiError(error) : null;
  const activeError = parsedError || lastErrorParsed;

  const handleRetry = () => {
    if (isRetrying || isGenerating) return;
    setIsRetrying(true);
    onRetry?.();
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Estimated read time
  const readTimeMinutes = useMemo(() => {
    const words = currentText.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [currentText]);

  // Hook Lab Audition options
  const hookOptions = useMemo(() => {
    const metricHook = alternativeHooks.find((h) => h.type === "metric");
    const contrarianHook = alternativeHooks.find((h) => h.type === "contrarian");
    const incidentHook = alternativeHooks.find((h) => h.type === "incident");

    return [
      {
        id: "metric",
        label: "📊 Metric",
        icon: BarChart3,
        hook: metricHook?.hook || null,
        fallbackText: "We improved system throughput by 3.4x with a single query pattern change:",
      },
      {
        id: "contrarian",
        label: "🥊 Contrarian",
        icon: Flame,
        hook: contrarianHook?.hook || null,
        fallbackText: "Stop rewriting code in Rust when your database indexing is the real bottleneck.",
      },
      {
        id: "incident",
        label: "🛠️ Incident",
        icon: Wrench,
        hook: incidentHook?.hook || null,
        fallbackText: "Last Thursday at 2:00 AM, our caching tier dropped 90% of requests. Here's why:",
      },
    ];
  }, [alternativeHooks]);

  const handleHookSelect = (hookText: string) => {
    if (!onApplyHook || !hookText) return;
    onApplyHook(hookText);
  };

  const isControlsDisabled = isPublishing || isUploading || isGenerating;

  return (
    <div
      className={cn(
        "space-y-3 bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-level-1 transition duration-200",
        className
      )}
    >
      {/* Top Action Bar */}
      <div className="flex flex-col gap-2 pb-2.5 border-b border-border/60">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Canvas Title, Status, and Read Time Tag */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-wrap">
            <div className="size-7 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
              <Bot className="size-4" />
            </div>
            <div>
              <Label
                htmlFor="draft-editor"
                className="text-xs sm:text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5"
              >
                <span>Interactive LinkedIn Canvas</span>
              </Label>
            </div>

            {/* Generation Spinner */}
            {isGenerating && (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-[11px] text-brand-blue font-medium animate-pulse select-none shrink-0"
                role="status"
                aria-live="polite"
              >
                <span className="relative flex size-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-brand-blue" />
                </span>
                <span>Generating...</span>
              </div>
            )}

            {/* Read Time Tag (small, no full row) */}
            {currentText && !isGenerating && (
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 select-none">
                <Clock className="size-3 text-muted-foreground shrink-0" />
                <span>{readTimeMinutes} min read</span>
              </span>
            )}
          </div>

          {/* Top Actions: View/Edit Toggle, Discard/New Post, Publish */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-wrap justify-end">
            {/* View / Edit Mode Switcher */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-xs",
                  effectiveViewMode === "preview"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="View formatted markdown preview"
              >
                <Eye className="size-3.5" />
                <span>View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isGenerating && currentText) {
                    setViewMode("edit");
                  }
                }}
                disabled={isGenerating || !currentText}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition text-xs",
                  effectiveViewMode === "edit"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                  isGenerating || !currentText
                    ? "opacity-40 cursor-not-allowed hover:text-muted-foreground"
                    : "cursor-pointer"
                )}
                title={isGenerating ? "Editing disabled while generating" : "Edit raw draft content"}
              >
                <Edit3 className="size-3.5" />
                <span>Edit</span>
              </button>
            </div>

            {/* New Post / Discard Button */}
            {(onDiscard || onNewPost) && currentText && !isGenerating && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                onClick={onNewPost || onDiscard}
                title="Start a new draft"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">New Post</span>
              </Button>
            )}

            {/* LinkedIn Publish Button */}
            <Button
              size="sm"
              className="h-8 px-3.5 text-xs font-semibold bg-brand-blue hover:bg-brand-blue-hover text-white gap-1.5 shadow-sm duration-200 cursor-pointer disabled:opacity-50 shrink-0"
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

        {/* Compact Inline Hook Lab Chips (no full row, no 'HOOK LAB:' label row) */}
        {alternativeHooks && alternativeHooks.length > 0 && currentText && !isGenerating && onApplyHook && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {hookOptions.map((opt) => {
              const targetText = opt.hook || opt.fallbackText;
              const isMatching = currentText.trim().startsWith(targetText.trim());
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleHookSelect(targetText)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 select-none",
                    isMatching
                      ? "bg-brand-blue/15 border-brand-blue text-brand-blue font-semibold ring-1 ring-brand-blue/30"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                  )}
                  title={`Audition ${opt.label}`}
                >
                  <opt.icon className="size-3 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Assistant UI Error State */}
      {(error || (isRetrying && isGenerating)) && (
        <ErrorState
          title={activeError?.title || "Something went wrong"}
          detail={
            activeError?.message ||
            "An unexpected error occurred while generating the post. Please try again."
          }
          retrying={isRetrying && Boolean(isGenerating)}
          onRetry={handleRetry}
          className="w-full"
        />
      )}

      {/* Assistant UI Reasoning Section with ElementsTimeline */}
      {reasoningSteps && reasoningSteps.length > 0 && (
        <AssistantReasoning
          reasoningSteps={reasoningSteps}
          isStreaming={isGenerating && (!draftText && !streamingText)}
        />
      )}

      {/* Grounded Web Search Result Card */}
      {((webSearchResults && webSearchResults.length > 0) || isSearchingWeb || webSearchSkippedReason) && (
        <WebSearch
          query={webSearchQuery || (webSearchSkippedReason ? "Web search skipped" : "Web search")}
          results={webSearchResults || []}
          visibleResults={(webSearchResults || []).length}
          searching={Boolean(isSearchingWeb)}
          skippedReason={webSearchSkippedReason || undefined}
          cycle={0}
        />
      )}

      {/* Scrollable Post Area: Internal scroll with max-height, auto-scrolls during streaming, no duplicate border */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full max-h-[520px] overflow-y-auto rounded-xl focus-within:ring-2 focus-within:ring-brand-blue/20 transition-colors duration-200"
        tabIndex={0}
        aria-label="Post Canvas Viewport"
      >
        {effectiveViewMode === "preview" ? (
          currentText ? (
            <LinkedInFeed
              draftText={currentText}
              selectedFiles={selectedFiles}
              user={user}
              showFoldMarker={false}
              onRemoveFile={handleRemoveFile}
            />
          ) : (
            <div className="rounded-xl p-8 text-center text-muted-foreground/60">
              <p className="text-sm italic">Your AI generated draft will appear here...</p>
            </div>
          )
        ) : (
          <Textarea
            id="draft-editor"
            className="w-full bg-muted/20 border-0 min-h-60 h-[480px] overflow-y-auto resize-none rounded-xl focus-visible:ring-1 focus-visible:ring-brand-blue/30 text-base sm:text-sm leading-relaxed text-slate-900 dark:text-slate-100 transition-colors duration-200 p-3 sm:p-4"
            value={currentText}
            onChange={(e) => onChange(e.target.value)}
            disabled={isPublishing || isGenerating}
            placeholder="Your AI generated draft will appear here..."
            aria-label="Interactive Draft Editor"
          />
        )}
      </div>

      {/* Post Footer: Inline Rating Thumbs & Attachments */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        {!isGenerating && currentText ? (
          <FeedbackToolbar runId={runId} disabled={isGenerating} />
        ) : (
          <div />
        )}
      </div>

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
