import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageSquare, Repeat2, Send, FileText } from "lucide-react";
import {
  AttachmentGroup,
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
} from "@/components/ui/attachment";

interface LinkedInFeedProps {
  draftText: string | null;
  selectedFiles?: Array<{ name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }> | null;
}

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({
  draftText,
  selectedFiles
}) => {
  if (!draftText) return null;

  return (
    <Card className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-blue/20">
          LA
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-foreground">LinkedIn Agent</h4>
          <p className="text-muted-foreground font-normal">Autonomous AI Technical Content Ghostwriter</p>
        </div>
      </div>
      <CardContent className="p-0 text-sm leading-relaxed text-foreground whitespace-pre-wrap select-text font-sans selection:bg-brand-blue/10">
        {draftText}
      </CardContent>

      {/* Attachments Row */}
      {selectedFiles && selectedFiles.length > 0 && (
        <AttachmentGroup className="w-full">
          {selectedFiles.map((file, idx) => {
            const isImage = file.type.startsWith("image/");
            const fileExt = file.type.split("/")[1]?.toUpperCase();
            return (
              <Attachment key={idx} state="done" size="sm" className="min-w-64">
                <AttachmentMedia variant={isImage ? "image" : "icon"}>
                  {isImage ? (
                    <img src={file.readUrl || file.base64} alt={file.name} className="pointer-events-none" />
                  ) : (
                    <FileText className="size-5 text-red-500" />
                  )}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{file.name}</AttachmentTitle>
                  <AttachmentDescription>{fileExt || "Document"}</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            );
          })}
        </AttachmentGroup>
      )}

      <div className="flex justify-between border-t border-border pt-3 text-xs text-muted-foreground font-medium">
        <Button variant="ghost" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer h-auto text-xs font-semibold" type="button">
          <ThumbsUp className="size-4" /> Like
        </Button>
        <Button variant="ghost" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer h-auto text-xs font-semibold" type="button">
          <MessageSquare className="size-4" /> Comment
        </Button>
        <Button variant="ghost" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer h-auto text-xs font-semibold" type="button">
          <Repeat2 className="size-4" /> Repost
        </Button>
        <Button variant="ghost" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-accent cursor-pointer h-auto text-xs font-semibold" type="button">
          <Send className="size-4" /> Send
        </Button>
      </div>
    </Card>
  );
};
