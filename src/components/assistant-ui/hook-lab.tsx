"use client";

import React, { useState } from "react";
import { Sparkles, Check, Copy, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { HookOption } from "@/types/stream";

export interface HookLabProps {
  hooks: HookOption[];
  currentDraft?: string;
  onApplyHook?: (hook: string) => void;
  className?: string;
}

const TYPE_CONFIG: Record<
  HookOption["type"],
  { label: string; badgeClass: string; borderClass: string }
> = {
  metric: {
    label: "Metric / Result",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    borderClass: "hover:border-emerald-500/40",
  },
  contrarian: {
    label: "Contrarian Challenge",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    borderClass: "hover:border-purple-500/40",
  },
  incident: {
    label: "Incident Teardown",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    borderClass: "hover:border-amber-500/40",
  },
  curiosity: {
    label: "Curiosity Loop",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    borderClass: "hover:border-blue-500/40",
  },
  question: {
    label: "Direct Question",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    borderClass: "hover:border-sky-500/40",
  },
};

export const HookLab: React.FC<HookLabProps> = ({
  hooks,
  currentDraft = "",
  onApplyHook,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [appliedHook, setAppliedHook] = useState<string | null>(null);
  const [copiedHook, setCopiedHook] = useState<string | null>(null);

  if (!hooks || hooks.length === 0) return null;

  const handleApply = (hookText: string) => {
    if (onApplyHook) {
      onApplyHook(hookText);
      setAppliedHook(hookText);
      toast.success("Hook applied to draft!");
    }
  };

  const handleCopy = async (hookText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hookText);
      setCopiedHook(hookText);
      toast.success("Hook copied to clipboard!");
      setTimeout(() => setCopiedHook(null), 2000);
    } catch {
      toast.error("Failed to copy hook.");
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-blue/20 bg-brand-blue/5 dark:bg-brand-blue/10 p-4 transition-all duration-300",
        className
      )}
    >
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-brand-blue/10 text-brand-blue">
            <Zap className="size-4 text-brand-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold tracking-tight uppercase text-foreground">
                Hook Lab: Alternative Openings
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">
                {hooks.length} Variations
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Swap the opening lines to test different scroll-stopping angles above the fold
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition p-1 cursor-pointer"
          aria-label={isExpanded ? "Collapse Hook Lab" : "Expand Hook Lab"}
        >
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in-up">
          {hooks.map((item, idx) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.curiosity;
            const isCurrentlyApplied = appliedHook === item.hook || currentDraft.startsWith(item.hook.trim());

            return (
              <div
                key={idx}
                className={cn(
                  "flex flex-col justify-between p-3 rounded-xl border bg-card text-foreground transition-all duration-200 shadow-xs",
                  isCurrentlyApplied
                    ? "border-brand-blue ring-1 ring-brand-blue/30 bg-brand-blue/[0.02]"
                    : "border-border hover:shadow-sm",
                  config.borderClass
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase",
                        config.badgeClass
                      )}
                    >
                      {config.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(item.hook, e)}
                      className="text-muted-foreground hover:text-foreground transition p-1 cursor-pointer"
                      title="Copy hook only"
                    >
                      {copiedHook === item.hook ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs font-medium text-foreground leading-relaxed italic">
                    &ldquo;{item.hook}&rdquo;
                  </p>

                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {item.rationale}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                  <Button
                    type="button"
                    variant={isCurrentlyApplied ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleApply(item.hook)}
                    disabled={isCurrentlyApplied}
                    className={cn(
                      "w-full h-7 text-[11px] font-semibold gap-1.5 cursor-pointer transition",
                      isCurrentlyApplied
                        ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
                        : "hover:bg-brand-blue hover:text-white hover:border-brand-blue"
                    )}
                  >
                    {isCurrentlyApplied ? (
                      <>
                        <Check className="size-3 text-brand-blue" />
                        <span>Active Hook</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3" />
                        <span>Apply to Draft</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
