"use client";

import React, { useState, useCallback } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api/config";
import { toast } from "sonner";

interface FeedbackToolbarProps {
  runId: string | null | undefined;
  disabled?: boolean;
}

export const FeedbackToolbar: React.FC<FeedbackToolbarProps> = ({ runId, disabled }) => {
  const [submitted, setSubmitted] = useState<"positive" | "negative" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prevRunId, setPrevRunId] = useState(runId);

  // Reset state when runId changes (new draft generated)
  if (prevRunId !== runId) {
    setPrevRunId(runId);
    setSubmitted(null);
    setSubmitting(false);
  }

  const sendFeedback = useCallback(
    async (score: 0 | 1) => {
      if (!runId || submitting || submitted) return;

      setSubmitting(true);
      const value = score === 1 ? "positive" : "negative";

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId, score, value }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
        }

        setSubmitted(value);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to submit feedback";
        toast.error(msg);
        setSubmitting(false);
      }
    },
    [runId, submitting, submitted]
  );

  // Don't render if no runId or explicitly disabled
  if (!runId || disabled) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-muted/50 border border-border/50",
        "animate-in fade-in slide-in-from-bottom-1 duration-300"
      )}
    >
      {submitted ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5 text-emerald-500" />
          <span className="font-medium">Thanks for your feedback!</span>
        </div>
      ) : (
        <>
          <span className="text-xs text-muted-foreground font-medium select-none">
            Rate this draft
          </span>
          <button
            type="button"
            onClick={() => sendFeedback(1)}
            disabled={submitting}
            className={cn(
              "inline-flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer",
              "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10",
              "disabled:opacity-40 disabled:pointer-events-none"
            )}
            title="Good draft"
            aria-label="Thumbs up"
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => sendFeedback(0)}
            disabled={submitting}
            className={cn(
              "inline-flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer",
              "text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
              "disabled:opacity-40 disabled:pointer-events-none"
            )}
            title="Needs improvement"
            aria-label="Thumbs down"
          >
            <ThumbsDown className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
