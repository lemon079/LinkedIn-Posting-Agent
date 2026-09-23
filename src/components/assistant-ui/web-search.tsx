"use client";

import React from "react";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WebSearchResult {
  title: string;
  domain: string;
}

export interface WebSearchProps extends React.HTMLAttributes<HTMLDivElement> {
  query: string;
  results: readonly WebSearchResult[];
  visibleResults: number;
  searching: boolean;
  cycle: number;
  className?: string;
}

/**
 * Official assistant-ui WebSearch element implementation.
 * Renders a live search query pill, status indicator line with shimmer when searching,
 * and a domain-avatar list of visible search result sources.
 */
export const WebSearch: React.FC<WebSearchProps> = ({
  query,
  results = [],
  visibleResults = 0,
  searching = false,
  cycle = 0,
  className,
  ...props
}) => {
  // Clamping visibleResults to 0...results.length safely
  const safeResults = Array.isArray(results) ? results : [];
  const count = safeResults.length;
  const clampedVisible = Math.max(
    0,
    Math.min(isNaN(visibleResults) ? 0 : visibleResults, count)
  );
  const visibleList = safeResults.slice(0, clampedVisible);

  // Safe query display: handles missing, undefined, or partially streamed strings
  const displayQuery =
    typeof query === "string" && query.trim().length > 0
      ? query.trim()
      : searching
      ? "Searching web…"
      : "Web search";

  return (
    <div
      data-slot="web-search"
      className={cn(
        "w-full my-3 rounded-xl border border-border bg-card/70 p-3 sm:p-4 text-xs space-y-2.5 transition-all select-none shadow-2xs",
        className
      )}
      {...props}
    >
      {/* 1. Query Pill: live query in a rounded field with search icon */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/80 text-foreground border border-border/60 text-[11px] font-medium max-w-full truncate">
          <Search className="size-3 text-muted-foreground shrink-0" />
          <span className="truncate">{displayQuery}</span>
        </span>
      </div>

      {/* 2. Status Line: Searching shimmer while running, else source count */}
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
        {searching ? (
          <>
            <Loader2 className="size-3 animate-spin text-brand-blue" />
            <span className="animate-pulse">Searching…</span>
          </>
        ) : (
          <span>
            {count > 0
              ? `Read ${count} source${count === 1 ? "" : "s"}`
              : "Read 0 sources"}
          </span>
        )}
      </div>

      {/* 3. Results Region: the first visibleResults results */}
      {visibleList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          {visibleList.map((item, index) => {
            const domainInitial =
              item.domain && item.domain.trim().length > 0
                ? item.domain.charAt(0).toUpperCase()
                : "W";

            return (
              <div
                key={`${cycle}-${index}-${item.domain}-${item.title}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border/40 transition-colors duration-150"
                title={`${item.title} (${item.domain})`}
              >
                <div className="size-5 rounded-md bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-[10px] shrink-0">
                  {domainInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.domain}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
