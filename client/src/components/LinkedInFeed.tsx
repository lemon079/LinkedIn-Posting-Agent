import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface LinkedInFeedProps {
  draftText: string | null;
}

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({ draftText }) => {
  if (!draftText) return null;

  return (
    <Card className="backdrop-blur-md bg-white/[0.03] border border-white/[0.08] shadow-2xl rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-blue/20">
          LA
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-slate-200">LinkedIn Agent</h4>
          <p className="text-slate-400">Autonomous AI Technical Content Ghostwriter</p>
          <p className="text-slate-500 mt-0.5">1h • 🌐</p>
        </div>
      </div>
      <CardContent className="p-0 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap select-text font-sans selection:bg-brand-blue/30">
        {draftText}
      </CardContent>
      <div className="flex justify-between border-t border-white/[0.05] pt-3 text-xs text-slate-400 font-medium">
        <button className="flex items-center gap-1.5 hover:text-slate-200 transition px-2 py-1.5 rounded-md hover:bg-white/[0.03]" type="button">👍 Like</button>
        <button className="flex items-center gap-1.5 hover:text-slate-200 transition px-2 py-1.5 rounded-md hover:bg-white/[0.03]" type="button">💬 Comment</button>
        <button className="flex items-center gap-1.5 hover:text-slate-200 transition px-2 py-1.5 rounded-md hover:bg-white/[0.03]" type="button">🔁 Repost</button>
        <button className="flex items-center gap-1.5 hover:text-slate-200 transition px-2 py-1.5 rounded-md hover:bg-white/[0.03]" type="button">✉️ Send</button>
      </div>
    </Card>
  );
};
