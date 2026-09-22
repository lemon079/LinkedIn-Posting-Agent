"use client";

import React, { type ComponentProps } from "react";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/lib/errors";

export interface ErrorStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "role"
> {
  title: string;
  detail: string;
  retrying: boolean;
  onRetry: () => void;
}

export function ErrorState({
  title,
  detail,
  retrying,
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  if (retrying) {
    return (
      <div
        data-slot="error-state"
        key="retrying"
        role="status"
        className={cn(
          "fade-in animate-in flex w-full items-center gap-2.5 text-sm duration-300 motion-reduce:animate-none",
          className
        )}
        {...props}
      >
        <RefreshCwIcon className="text-foreground/45 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        <span className="text-foreground/55 relative inline-block font-medium">
          Retrying
        </span>
      </div>
    );
  }

  return (
    <div
      data-slot="error-state"
      key="error"
      role="alert"
      className={cn(
        "fade-in animate-in flex w-full items-start gap-2.5 rounded-2xl bg-red-500/[0.06] px-4 py-3 text-sm duration-300 motion-reduce:animate-none dark:bg-red-500/10",
        className
      )}
      {...props}
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-red-500/80" />
      <div className="space-y-0.5 min-w-0 flex-1">
        <p className="font-medium text-red-600 dark:text-red-400">{title}</p>
        <p className="text-[13px] leading-snug text-red-600/60 dark:text-red-400/60 break-words">
          {detail}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="ms-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 cursor-pointer shrink-0"
      >
        <RefreshCwIcon className="size-3" />
        Retry
      </button>
    </div>
  );
}

export interface AssistantErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  error: string | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

/**
 * Backward-compatible wrapper delegating to assistant-ui's standard ErrorState.
 */
export const AssistantErrorState: React.FC<AssistantErrorStateProps> = ({
  error,
  onRetry,
  className,
  ...props
}) => {
  if (!error) return null;

  const parsed = parseApiError(error);
  const title = parsed.title || "Something went wrong";
  const detail = parsed.message || "An unexpected error occurred while generating the post. Please try again.";

  return (
    <ErrorState
      title={title}
      detail={detail}
      retrying={false}
      onRetry={onRetry ?? (() => {})}
      className={className}
      {...props}
    />
  );
};
