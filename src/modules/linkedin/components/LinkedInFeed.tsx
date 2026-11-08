"use client";

import React, { useState } from "react";
import { FileText, X, Globe, Edit3, Eye, Check } from "lucide-react";
import Image from "next/image";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  isEditing?: boolean;
  onToggleEdit?: (editing: boolean) => void;
  onChange?: (value: string) => void;
  onRemoveFile?: (index: number) => void;
  showFoldMarker?: boolean;
}

/** Responsive image mosaic — mirrors LinkedIn's own grid layout */
const ImageMosaic: React.FC<{
  files: MediaFileMetadata[];
  onRemoveFile?: (index: number) => void;
}> = ({ files, onRemoveFile }) => {
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

  const cellClass = "overflow-hidden rounded-xl bg-muted/60 border border-border/40 relative group";

  return (
    <div className="space-y-2.5 pt-1">
      {count > 0 && (
        <div className={`grid ${gridClass} gap-2`}>
          {count === 1 && (
            <div className={`${cellClass} aspect-video relative`}>
              <Image src={imgSrc(images[0])} alt={images[0].name} fill unoptimized className="w-full h-full object-cover" />
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(0)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {count === 2 && images.map((f, i) => (
            <div key={i} className={`${cellClass} aspect-square relative`}>
              <Image src={imgSrc(f)} alt={f.name} fill unoptimized className="w-full h-full object-cover" />
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}

          {count === 3 && (
            <>
              <div className={`${cellClass} row-span-2 aspect-square relative`}>
                <Image src={imgSrc(images[0])} alt={images[0].name} fill unoptimized className="w-full h-full object-cover" />
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(0)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <div className={`${cellClass} aspect-square relative`}>
                <Image src={imgSrc(images[1])} alt={images[1].name} fill unoptimized className="w-full h-full object-cover" />
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(1)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <div className={`${cellClass} aspect-square relative`}>
                <Image src={imgSrc(images[2])} alt={images[2].name} fill unoptimized className="w-full h-full object-cover" />
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(2)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </>
          )}

          {count >= 4 && (
            <>
              {images.slice(0, 3).map((f, i) => (
                <div key={i} className={`${cellClass} aspect-square relative`}>
                  <Image src={imgSrc(f)} alt={f.name} fill unoptimized className="w-full h-full object-cover" />
                  {onRemoveFile && (
                    <button
                      type="button"
                      onClick={() => onRemoveFile(i)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className={`${cellClass} aspect-square relative`}>
                <Image src={imgSrc(images[3])} alt={images[3].name} fill unoptimized className="w-full h-full object-cover" />
                {count > 4 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-xl">
                    <span className="text-white font-bold text-xl">+{count - 4}</span>
                  </div>
                )}
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(3)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Non-image documents */}
      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((f, i) => {
            const ext = f.type.split("/")[1]?.toUpperCase() || "FILE";
            return (
              <div key={i} className="flex items-center justify-between gap-2.5 p-3 bg-muted/50 rounded-xl border border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-card rounded-lg border border-border/80 shrink-0 text-brand-blue">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{ext}</p>
                  </div>
                </div>
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(count + i)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Finds the natural break point around ~180-210 chars for LinkedIn's mobile truncation boundary */
function splitAtFold(text: string, foldTarget = 195): { before: string; after: string } | null {
  if (text.length <= foldTarget + 30) return null;
  let splitIndex = -1;
  // Scan backwards from foldTarget for whitespace or newline
  for (let i = foldTarget; i >= 160; i--) {
    if (/\s/.test(text[i])) {
      splitIndex = i;
      break;
    }
  }
  if (splitIndex === -1) {
    for (let i = foldTarget; i <= 240 && i < text.length; i++) {
      if (/\s/.test(text[i])) {
        splitIndex = i;
        break;
      }
    }
  }
  if (splitIndex === -1) splitIndex = foldTarget;

  return {
    before: text.slice(0, splitIndex),
    after: text.slice(splitIndex),
  };
}

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({
  draftText,
  selectedFiles,
  className,
  user,
  isEditing = false,
  onToggleEdit,
  onChange,
  onRemoveFile,
  showFoldMarker = true,
}) => {
  const [localEdit, setLocalEdit] = useState(isEditing);
  const activeEditing = onToggleEdit ? isEditing : localEdit;
  const setEditing = onToggleEdit ? onToggleEdit : setLocalEdit;

  if (!draftText && !activeEditing) return null;

  const text = draftText || "";
  const hasFiles = selectedFiles && selectedFiles.length > 0;

  const displayName = user?.name || (user?.email ? user.email.split("@")[0] : "Your Name");
  const displayHeadline = user?.headline || "Senior Software Engineer • Practicing Architect";
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "YOU";

  const fold = showFoldMarker && !activeEditing ? splitAtFold(text) : null;

  return (
    <div
      className={cn(
        "p-2 sm:p-3 transition-all duration-200 relative group selection:bg-brand-blue/15",
        className
      )}
    >
      {/* Author Row — Authentic LinkedIn Feed Anatomy */}
      <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3.5 mb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={displayName}
              width={44}
              height={44}
              className="size-10 sm:size-11 rounded-full object-cover shrink-0 ring-1 ring-border/60"
              unoptimized
            />
          ) : (
            <div className="size-10 sm:size-11 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs shrink-0 select-none">
              {initials}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">{displayName}</h4>
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded shrink-0">
                You
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{displayHeadline}</p>
            <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5 font-mono">
              <span>Just now</span>
              <span>•</span>
              <Globe className="size-2.5 inline" />
              <span>Public</span>
            </p>
          </div>
        </div>

        {/* Quick In-Place Edit Switcher */}
        {onChange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!activeEditing)}
            className="h-7 px-2.5 text-[11px] font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border border-border/50 hover:bg-muted/60"
            title={activeEditing ? "View rendered post" : "Edit draft text in-place"}
          >
            {activeEditing ? (
              <>
                <Check className="size-3 text-emerald-600" />
                <span>Done</span>
              </>
            ) : (
              <>
                <Edit3 className="size-3" />
                <span>Edit</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Main Content: Direct In-Place Editor OR Rendered Markdown with Fold Marker */}
      {activeEditing && onChange ? (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your LinkedIn post here..."
            className="w-full bg-transparent border-0 resize-y p-0 focus-visible:ring-0 text-[14.5px] sm:text-[15px] leading-[1.48] text-foreground font-sans min-h-[220px]"
            autoFocus
          />
          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              className="h-7 text-xs font-medium cursor-pointer rounded-lg gap-1"
            >
              <Eye className="size-3" /> Preview Post
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="text-[14.5px] sm:text-[15px] leading-[1.48] text-foreground select-text font-sans selection:bg-brand-blue/15"
          onDoubleClick={() => onChange && setEditing(true)}
        >
          {fold ? (
            <>
              {/* Pre-Fold Text */}
              <div className="space-y-2">
                <MarkdownText>{fold.before}</MarkdownText>
              </div>

              {/* Visual "...see more" Fold Marker at ~190-210 characters */}
              <div className="relative my-3.5 select-none" aria-label="Mobile fold guide">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-dashed border-amber-500/35 dark:border-amber-400/30" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-2.5 py-0.5 text-[10px] font-mono tracking-tight text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    mobile fold boundary (~200 chars) • readers tap &quot;…see more&quot; here
                  </span>
                </div>
              </div>

              {/* Post-Fold Text */}
              <div className="space-y-2">
                <MarkdownText>{fold.after}</MarkdownText>
              </div>
            </>
          ) : (
            <MarkdownText>{text}</MarkdownText>
          )}
        </div>
      )}

      {/* Attachments preview */}
      {hasFiles && <ImageMosaic files={selectedFiles!} onRemoveFile={onRemoveFile} />}
    </div>
  );
};
