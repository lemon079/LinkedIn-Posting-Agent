"use client";

import React from "react";
import { FileText } from "lucide-react";
import Image from "next/image";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { cn } from "@/lib/utils";
import type { MediaFileMetadata } from "@/modules/media/types";

export interface LinkedInFeedUser {
  name?: string;
  email?: string;
  avatarUrl?: string;
  headline?: string;
}

export interface LinkedInFeedProps {
  draftText: string | null;
  selectedFiles?: MediaFileMetadata[] | null;
  className?: string;
  user?: LinkedInFeedUser | null;
}

/** Responsive image mosaic — mirrors LinkedIn's own grid layout */
const ImageMosaic: React.FC<{ files: MediaFileMetadata[] }> = ({ files }) => {
  const images = files.filter((f) => f.type.startsWith("image/"));
  const docs = files.filter((f) => !f.type.startsWith("image/"));
  const count = images.length;

  const imgSrc = (f: MediaFileMetadata) => f.readUrl || f.base64 || "";

  const gridClass = (() => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2";
    return "grid-cols-2"; // 4+
  })();

  const cellClass = "overflow-hidden rounded-lg bg-muted";

  return (
    <div className="space-y-2">
      {count > 0 && (
        <div className={`grid ${gridClass} gap-1.5`}>
          {count === 1 && (
            <div className={`${cellClass} aspect-video relative`}>
              <Image src={imgSrc(images[0])} alt={images[0].name} fill unoptimized className="w-full h-full object-cover" />
            </div>
          )}

          {count === 2 && images.map((f, i) => (
            <div key={i} className={`${cellClass} aspect-square relative`}>
              <Image src={imgSrc(f)} alt={f.name} fill unoptimized className="w-full h-full object-cover" />
            </div>
          ))}

          {count === 3 && (
            <>
              <div className={`${cellClass} row-span-2 aspect-square relative`}>
                <Image src={imgSrc(images[0])} alt={images[0].name} fill unoptimized className="w-full h-full object-cover" />
              </div>
              <div className={`${cellClass} aspect-square relative`}>
                <Image src={imgSrc(images[1])} alt={images[1].name} fill unoptimized className="w-full h-full object-cover" />
              </div>
              <div className={`${cellClass} aspect-square relative`}>
                <Image src={imgSrc(images[2])} alt={images[2].name} fill unoptimized className="w-full h-full object-cover" />
              </div>
            </>
          )}

          {count >= 4 && (
            <>
              {images.slice(0, 3).map((f, i) => (
                <div key={i} className={`${cellClass} aspect-square relative`}>
                  <Image src={imgSrc(f)} alt={f.name} fill unoptimized className="w-full h-full object-cover" />
                </div>
              ))}
              <div className={`${cellClass} aspect-square relative`}>
                <Image src={imgSrc(images[3])} alt={images[3].name} fill unoptimized className="w-full h-full object-cover" />
                {count > 4 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-lg">
                    <span className="text-white font-bold text-xl">+{count - 4}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Non-image documents */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map((f, i) => {
            const ext = f.type.split("/")[1]?.toUpperCase() || "FILE";
            return (
              <div key={i} className="flex items-center gap-2.5 p-2.5 bg-muted rounded-lg border border-border">
                <div className="p-1.5 bg-card rounded-md border border-border shrink-0">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{ext}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({
  draftText,
  selectedFiles,
  className,
  user,
}) => {
  if (!draftText) return null;

  const hasFiles = selectedFiles && selectedFiles.length > 0;

  const displayName = user?.name || (user?.email ? user.email.split("@")[0] : "Your Name");
  const displayHeadline = user?.headline || "Your LinkedIn Post Preview";
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "YOU";

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Author row — User's Authentic LinkedIn Identity */}
      <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={displayName}
            width={36}
            height={36}
            className="size-9 rounded-full object-cover shrink-0 ring-1 ring-border/50"
            unoptimized
          />
        ) : (
          <div className="size-9 rounded-full bg-brand-blue/10 border border-brand-blue/25 text-brand-blue flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none">
            {initials}
          </div>
        )}
        <div className="text-xs leading-tight">
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-foreground">{displayName}</h4>
            <span className="text-[10px] text-muted-foreground font-normal">• You</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{displayHeadline} • Just now</p>
        </div>
      </div>

      {/* Post text rendered in Markdown */}
      <div className="text-sm leading-relaxed text-foreground select-text font-sans selection:bg-brand-blue/10">
        <MarkdownText>{draftText}</MarkdownText>
      </div>

      {/* Attachments mosaic */}
      {hasFiles && <ImageMosaic files={selectedFiles!} />}
    </div>
  );
};
