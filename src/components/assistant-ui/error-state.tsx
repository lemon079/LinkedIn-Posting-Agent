"use client";

import React from "react";
import {
  AlertCircle,
  RotateCcw,
  X,
  Settings,
  Hourglass,
  ZapOff,
  Clock,
  KeyRound,
  WifiOff,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseApiError, type ParsedApiError } from "@/lib/errors";

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

  const parsed: ParsedApiError = parseApiError(error);
  const isAmber =
    parsed.type === "rate_limit" ||
    parsed.type === "quota_exhausted" ||
    parsed.type === "linkedin_rate_limit" ||
    parsed.type === "model_overloaded";

  const isAuth = parsed.type === "auth";

  // Dynamic icon based on error type
  const renderIcon = () => {
    switch (parsed.type) {
      case "rate_limit":
        return <Hourglass className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />;
      case "quota_exhausted":
        return <ZapOff className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      case "linkedin_rate_limit":
        return <Clock className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      case "model_overloaded":
        return <Hourglass className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      case "auth":
        return <KeyRound className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />;
      case "network":
        return <WifiOff className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
      default:
        return <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />;
    }
  };

  // Badge label for category
  const renderBadge = () => {
    if (parsed.retryAfterSeconds) {
      return `Retry in ~${parsed.retryAfterSeconds}s`;
    }
    switch (parsed.type) {
      case "rate_limit":
        return "API Rate Limit";
      case "quota_exhausted":
        return "Quota Exhausted";
      case "linkedin_rate_limit":
        return "LinkedIn Throttle";
      case "model_overloaded":
        return "High Server Load";
      case "auth":
        return "Authentication";
      case "model_not_found":
        return "Model Config";
      case "network":
        return "Network Issue";
      default:
        return null;
    }
  };

  const badgeText = renderBadge();

  return (
    <div
      role="alert"
      className={cn(
        "p-4 rounded-xl border text-xs shadow-xs animate-fade-in space-y-3 transition-colors duration-200 backdrop-blur-xs",
        isAmber
          ? "border-amber-300/80 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
          : isAuth
            ? "border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100"
            : "border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-950 dark:text-red-100",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {renderIcon()}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={cn(
                  "font-semibold leading-tight text-sm",
                  isAmber
                    ? "text-amber-900 dark:text-amber-100"
                    : isAuth
                      ? "text-indigo-900 dark:text-indigo-100"
                      : "text-red-900 dark:text-red-100"
                )}
              >
                {parsed.title}
              </h4>
              {badgeText && (
                <span
                  className={cn(
                    "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                    isAmber
                      ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300/60 dark:border-amber-700/60"
                      : isAuth
                        ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border-indigo-300/60 dark:border-indigo-700/60"
                        : "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 border-red-300/60 dark:border-red-700/60"
                  )}
                >
                  {badgeText}
                </span>
              )}
            </div>

            <p
              className={cn(
                "leading-relaxed wrap-break-word",
                isAmber
                  ? "text-amber-800/95 dark:text-amber-200/90"
                  : isAuth
                    ? "text-indigo-800/95 dark:text-indigo-200/90"
                    : "text-red-800/95 dark:text-red-200/90"
              )}
            >
              {parsed.message}
            </p>

            {/* Contextual Actionable Advice */}
            {parsed.advice && (
              <div
                className={cn(
                  "mt-2 pt-2 pb-1.5 px-2.5 rounded-lg flex items-start gap-2 border text-[11px] leading-relaxed",
                  isAmber
                    ? "bg-amber-100/70 dark:bg-amber-900/40 border-amber-300/50 dark:border-amber-700/50 text-amber-900 dark:text-amber-200"
                    : isAuth
                      ? "bg-indigo-100/70 dark:bg-indigo-900/40 border-indigo-300/50 dark:border-indigo-700/50 text-indigo-900 dark:text-indigo-200"
                      : "bg-red-100/70 dark:bg-red-900/40 border-red-300/50 dark:border-red-700/50 text-red-900 dark:text-red-200"
                )}
              >
                <Lightbulb className="size-3.5 shrink-0 mt-0.5 opacity-80" />
                <span>{parsed.advice}</span>
              </div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "transition cursor-pointer p-1 rounded-md shrink-0",
              isAmber
                ? "text-amber-500 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
                : isAuth
                  ? "text-indigo-500 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
                  : "text-red-400 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
            )}
            aria-label="Dismiss error"
            title="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {onRetry && parsed.isRetryable && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className={cn(
              "h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer shadow-none",
              isAmber
                ? "bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/80"
                : isAuth
                  ? "bg-white dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-900/80"
                  : "bg-white dark:bg-red-900/50 border-red-300 dark:border-red-700 text-red-800 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-900/80"
            )}
          >
            <RotateCcw className="size-3" />
            <span>Try Again</span>
          </Button>
        )}

        {(parsed.suggestSettings || isAuth || isAmber) && onOpenSettings && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className={cn(
              "h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer shadow-none",
              isAmber
                ? "bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/80"
                : isAuth
                  ? "bg-white dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-900/80"
                  : "bg-white dark:bg-red-900/50 border-red-300 dark:border-red-700 text-red-800 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-900/80"
            )}
          >
            <Settings className="size-3" />
            <span>{isAmber ? "Change Model / Settings" : "Check Settings"}</span>
          </Button>
        )}
      </div>
    </div>
  );
};
