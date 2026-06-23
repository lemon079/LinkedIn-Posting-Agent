import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";

interface LinkedInFeedProps {
  draftText: string | null;
}

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({
  draftText
}) => {
  if (!draftText) return null;

  return (
    <Card className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-blue/20">
          LA
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-slate-800">LinkedIn Agent</h4>
          <p className="text-slate-500 font-normal">Autonomous AI Technical Content Ghostwriter</p>
        </div>
      </div>
      <CardContent className="p-0 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap select-text font-sans selection:bg-brand-blue/10">
        {draftText}
      </CardContent>

      <div className="flex justify-between border-t border-border pt-3 text-xs text-slate-500 font-medium">
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer" type="button">
          <ThumbsUp className="size-4" /> Like
        </button>
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer" type="button">
          <MessageSquare className="size-4" /> Comment
        </button>
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer" type="button">
          <Repeat2 className="size-4" /> Repost
        </button>
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer" type="button">
          <Send className="size-4" /> Send
        </button>
      </div>
    </Card>
  );
};
