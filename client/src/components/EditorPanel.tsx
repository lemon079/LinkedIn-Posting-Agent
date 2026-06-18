import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface EditorPanelProps {
  draftText: string; isPublishing: boolean;
  onChange: (value: string) => void; onPublish: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  draftText, isPublishing, onChange, onPublish,
}) => {
  const charCount = draftText.length;
  const pct = Math.min((charCount / 3000) * 100, 100);
  const strokeDashoffset = 100 - pct;

  const colorClass = charCount > 3000
    ? "text-red-600 stroke-red-600"
    : charCount > 2800
    ? "text-yellow-600 stroke-yellow-600"
    : "text-brand-blue stroke-brand-blue";

  return (
    <div className="space-y-4 bg-card border border-border p-5 rounded-2xl shadow-sm animate-fade-in-up transition-all duration-300 hover:scale-[1.005] hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <Label htmlFor="draft-editor" className="text-sm font-semibold text-slate-700">Live Post Editor</Label>
        <div className="flex items-center gap-2 text-xs">
          <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-slate-100" cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" />
            <circle
              className={`transition-all duration-300 ${colorClass}`}
              cx="18" cy="18" r="16" fill="none" strokeWidth="3.5"
              strokeDasharray="100" strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className={`font-mono font-medium ${charCount > 3000 ? "text-red-600" : "text-slate-500"}`}>
            {charCount}/3000
          </span>
        </div>
      </div>
      <Textarea
        id="draft-editor"
        className="w-full bg-card border-border min-h-[220px] rounded-xl focus-visible:ring-brand-blue/40 text-sm leading-relaxed text-slate-900 transition-all duration-300 focus-visible:scale-[1.005]"
        value={draftText} onChange={(e) => onChange(e.target.value)}
        disabled={isPublishing}
      />
      <Button
        className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold py-5 rounded-lg hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-sm duration-200"
        onClick={onPublish} disabled={isPublishing || charCount > 3000 || charCount === 0}
      >
        {isPublishing ? "Publishing Post..." : <><Send className="size-4" /> Approve & Publish Post</>}
      </Button>
    </div>
  );
};
