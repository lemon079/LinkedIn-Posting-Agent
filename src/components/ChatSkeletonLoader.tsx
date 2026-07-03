import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ChatSkeletonLoaderProps {
  text: string;
  onComplete?: () => void;
}

function SkeletonLine({ width, className }: { width: string; className?: string }) {
  return (
    <div
      className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 h-3.5 rounded-md bg-size-[300%_100%] animate-shimmer-sweep opacity-55",
        "bg-[linear-gradient(90deg,var(--muted)_0%,var(--muted)_40%,color-mix(in_oklch,var(--muted),var(--primary)_25%)_50%,var(--muted)_60%,var(--muted)_100%)]",
        "transition-opacity duration-150 ease-out",
        className
      )}
      style={{ width }}
    />
  );
}

export const ChatSkeletonLoader: React.FC<ChatSkeletonLoaderProps> = ({ text, onComplete }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedLength, setStreamedLength] = useState(0);

  const targetLines = useMemo(() => {
    if (!text) return ["", "", ""] as [string, string, string];
    const words = text.split(" ");
    if (words.length <= 3) {
      return [
        words[0] || "",
        words[1] || "",
        words.slice(2).join(" ")
      ] as [string, string, string];
    }
    const oneThird = Math.ceil(words.length / 3);
    const line1 = words.slice(0, oneThird).join(" ");
    const line2 = words.slice(oneThird, oneThird * 2).join(" ");
    const line3 = words.slice(oneThird * 2).join(" ");
    return [line1, line2, line3] as [string, string, string];
  }, [text]);

  useEffect(() => {
    // 1. Hold period of 1.2s before streaming starts
    const holdTimer = setTimeout(() => {
      setIsStreaming(true);
    }, 1200);

    return () => clearTimeout(holdTimer);
  }, []);

  const totalLength = targetLines[0].length + targetLines[1].length + targetLines[2].length;

  useEffect(() => {
    if (!isStreaming || totalLength === 0) return;

    // 2. Stream character-by-character
    const interval = setInterval(() => {
      setStreamedLength((prev) => {
        if (prev < totalLength) {
          return prev + 1;
        } else {
          clearInterval(interval);
          if (onComplete) {
            setTimeout(onComplete, 400);
          }
          return prev;
        }
      });
    }, 6); // Fast 6ms per character interval for smooth typing

    return () => clearInterval(interval);
  }, [isStreaming, totalLength, onComplete]);

  const line1 = targetLines[0].slice(0, Math.max(0, streamedLength));
  const line2 = targetLines[1].slice(0, Math.max(0, streamedLength - targetLines[0].length));
  const line3 = targetLines[2].slice(0, Math.max(0, streamedLength - targetLines[0].length - targetLines[1].length));

  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 animate-fade-in-up">
      {/* Ghostwriter Profile Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-blue/20 animate-pulse">
          LA
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-slate-800">LinkedIn Agent</h4>
          <p className="text-slate-500 font-normal">Streaming generated draft...</p>
        </div>
      </div>

      {/* Synchronized Shimmering Rows */}
      <div className="flex flex-col gap-2.5 pt-2">
        {/* Row 1 */}
        <div className="relative min-h-6 flex items-center">
          <SkeletonLine
            width="90%"
            className={cn(isStreaming ? "opacity-0 pointer-events-none" : "opacity-55")}
          />
          <p className="relative z-10 text-slate-800 text-sm font-normal leading-relaxed whitespace-pre-wrap select-text font-sans">
            {line1}
          </p>
        </div>

        {/* Row 2 */}
        <div className="relative min-h-6 flex items-center">
          <SkeletonLine
            width="72%"
            className={cn(isStreaming ? "opacity-0 pointer-events-none" : "opacity-55")}
          />
          <p className="relative z-10 text-slate-800 text-sm font-normal leading-relaxed whitespace-pre-wrap select-text font-sans">
            {line2}
          </p>
        </div>

        {/* Row 3 */}
        <div className="relative min-h-6 flex items-center">
          <SkeletonLine
            width="95%"
            className={cn(isStreaming ? "opacity-0 pointer-events-none" : "opacity-55")}
          />
          <p className="relative z-10 text-slate-800 text-sm font-normal leading-relaxed whitespace-pre-wrap select-text font-sans">
            {line3}
          </p>
        </div>
      </div>
    </div>
  );
};
