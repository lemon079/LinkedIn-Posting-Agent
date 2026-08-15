"use client";

import React from "react";
import { AlertCircle, RotateCcw, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AssistantErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  error: string | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export const AssistantErrorState: React.FC<AssistantErrorStateProps> = ({
  error,
  onRetry,
  onDismiss,
  onOpenSettings,
  className,
  ...props
}) => {
  if (!error) return null;

  const errorMessage = typeof error === "string" ? error : error.message;
  const isRateLimit = errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("rate limit");
  const isAuthError = errorMessage.toLowerCase().includes("auth") || errorMessage.toLowerCase().includes("key") || errorMessage.toLowerCase().includes("unauthorized");

  return (
    <div
      role="alert"
      className={cn(
        "p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-900 dark:text-red-200 text-xs shadow-xs animate-fade-in space-y-3",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <h4 className="font-semibold text-red-800 dark:text-red-200 leading-tight">
              {isRateLimit
                ? "LLM Provider Rate Limit Exceeded"
                : isAuthError
                  ? "Authentication Required"
                  : "Generation Encountered an Error"}
            </h4>
            <p className="text-red-700/90 dark:text-red-300/80 leading-relaxed wrap-break-word">
              {errorMessage}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-200 transition cursor-pointer p-0.5 rounded-md shrink-0"
            aria-label="Dismiss error"
            title="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 px-2.5 text-xs font-semibold bg-white dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 hover:bg-red-100/70 dark:hover:bg-red-900/70 gap-1.5 cursor-pointer shadow-none"
          >
            <RotateCcw className="size-3" />
            <span>Try Again</span>
          </Button>
        )}

        {isAuthError && onOpenSettings && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="h-7 px-2.5 text-xs font-semibold bg-white dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 hover:bg-red-100/70 dark:hover:bg-red-900/70 gap-1.5 cursor-pointer shadow-none"
          >
            <Settings className="size-3" />
            <span>Check Settings</span>
          </Button>
        )}
      </div>
    </div>
  );
};
