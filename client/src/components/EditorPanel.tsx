import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditorPanelProps {
  draftText: string;
  isPublishing: boolean;
  onChange: (value: string) => void;
  onPublish: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  draftText,
  isPublishing,
  onChange,
  onPublish,
}) => {
  const charCount = draftText.length;
  const pct = Math.min((charCount / 3000) * 100, 100);
  const strokeDashoffset = 100 - pct;

  const colorClass = charCount > 3000
    ? "text-red-500 stroke-red-500"
    : charCount > 2800
    ? "text-yellow-500 stroke-yellow-500"
    : "text-accent stroke-accent";

  return (
    <div className="space-y-4 backdrop-blur-md bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl">
      <div className="flex items-center justify-between">
        <Label htmlFor="draft-editor" className="text-sm font-semibold text-slate-300">Live Post Editor</Label>
        <div className="flex items-center gap-2 text-xs">
          <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-white/[0.05]" cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" />
            <circle
              className={`transition-all duration-300 ${colorClass}`}
              cx="18"
              cy="18"
              r="16"
              fill="none"
              strokeWidth="3.5"
              strokeDasharray="100"
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className={`font-mono font-medium ${charCount > 3000 ? "text-red-400" : "text-slate-400"}`}>
            {charCount}/3000
          </span>
        </div>
      </div>
      <Textarea
        id="draft-editor"
        className="w-full bg-white/[0.02] border-white/[0.08] min-h-[220px] rounded-xl focus-visible:ring-accent/40 text-sm leading-relaxed"
        value={draftText}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPublishing}
      />
      <Button
        className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-5 rounded-lg hover:scale-[1.01] transition"
        onClick={onPublish}
        disabled={isPublishing || charCount > 3000 || charCount === 0}
      >
        {isPublishing ? "Publishing Post..." : "🚀 Approve & Publish Post"}
      </Button>
    </div>
  );
};
