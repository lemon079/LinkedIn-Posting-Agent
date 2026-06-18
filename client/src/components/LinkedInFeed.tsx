import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface LinkedInFeedProps {
  draftText: string | null;
}

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({ draftText }) => {
  if (!draftText) return null;

  return (
    <Card className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-4 animate-fade-in-up transition-all duration-300 hover:scale-[1.005] hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-blue/20">
          LA
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-slate-800">LinkedIn Agent</h4>
          <p className="text-slate-500 font-normal">Autonomous AI Technical Content Ghostwriter</p>
          <p className="text-slate-400 mt-0.5">1h • 🌐</p>
        </div>
      </div>
      <CardContent className="p-0 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap select-text font-sans selection:bg-brand-blue/10">
        {draftText}
      </CardContent>
      <div className="flex justify-between border-t border-border pt-3 text-xs text-slate-500 font-medium">
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2 py-1.5 rounded-md hover:bg-slate-50 active:scale-[0.97]" type="button">👍 Like</button>
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2 py-1.5 rounded-md hover:bg-slate-50 active:scale-[0.97]" type="button">💬 Comment</button>
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2 py-1.5 rounded-md hover:bg-slate-50 active:scale-[0.97]" type="button">🔁 Repost</button>
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2 py-1.5 rounded-md hover:bg-slate-50 active:scale-[0.97]" type="button">✉️ Send</button>
      </div>
    </Card>
  );
};
