"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { X, FileText, Paperclip, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MediaFileMetadata } from "@/types/media";

export type AssistantAttachmentItem = MediaFileMetadata;

export interface AssistantAttachmentsProps {
  files: AssistantAttachmentItem[];
  onRemoveFile: (index: number) => void;
  onUploadFile?: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

export const AssistantAttachments: React.FC<AssistantAttachmentsProps> = ({
  files,
  onRemoveFile,
  onUploadFile,
  isUploading = false,
  disabled = false,
  maxFiles = 20,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const isScrollable = el.scrollWidth > el.clientWidth;
        if (!isScrollable) return;

        const isAtStart = el.scrollLeft === 0 && e.deltaY < 0;
        const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth && e.deltaY > 0;

        if (!isAtStart && !isAtEnd) {
          e.preventDefault();
          el.scrollBy({ left: e.deltaY < 0 ? -60 : 60 });
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const availableSlots = maxFiles - files.length;
    if (selected.length > availableSlots) {
      alert(`You can only add up to ${availableSlots} more file(s).`);
    }
    selected.slice(0, availableSlots).forEach((file) => {
      if (file.size > 4 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 4MB limit.`);
        return;
      }
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Unsupported file type. Please select a JPEG, PNG, or WebP image.");
        return;
      }
      onUploadFile?.(file);
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    const availableSlots = maxFiles - files.length;
    dropped.slice(0, availableSlots).forEach((file) => {
      if (file.size <= 4 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        onUploadFile?.(file);
      }
    });
  };

  return (
    <div
      className={cn("w-full", className)}
      onDragOver={(e) => {
        if (!disabled) e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      <div
        ref={scrollRef}
        className="flex min-w-0 snap-x snap-mandatory scroll-px-1 scrollbar-none gap-2 overflow-x-auto overscroll-x-contain py-1"
      >
        {files.map((file, idx) => {
          const isImage = file.type.startsWith("image/");
          const fileExt = file.type.split("/")[1]?.toUpperCase() || "IMG";
          const previewSrc = file.readUrl || file.base64 || "";

          return (
            <div
              key={`${file.name}-${idx}`}
              className="group relative flex w-fit max-w-full min-w-44 shrink-0 snap-start items-center gap-2 rounded-lg border border-border bg-card p-1.5 shadow-xs transition hover:border-outline-variant text-xs select-none"
            >
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="relative flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground cursor-pointer hover:opacity-85 transition"
                    title="Click to view full preview"
                  >
                    {isImage && previewSrc ? (
                      <Image
                        src={previewSrc}
                        alt={file.name}
                        width={36}
                        height={36}
                        className="size-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <FileText className="size-4 text-brand-blue" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition text-white">
                      <Eye className="size-3.5" />
                    </span>
                  </button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="truncate pr-6">{file.name}</DialogTitle>
                  </DialogHeader>
                  <div className="pt-2 flex flex-col items-center justify-center min-h-50 relative">
                    {previewSrc ? (
                      <Image
                        src={previewSrc}
                        alt={file.name}
                        fill
                        unoptimized
                        className="relative! max-w-full max-h-[60vh] object-contain rounded-lg border border-border shadow-sm"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">Preview not available.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <div className="min-w-0 flex-1 leading-tight pr-1">
                <p className="block truncate font-medium text-slate-800 dark:text-slate-200">
                  {file.name}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">{fileExt}</p>
              </div>

              {/* Explicit Delete Button */}
              <div className="relative z-20 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md cursor-pointer transition"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  disabled={disabled}
                  aria-label={`Delete ${file.name}`}
                  title={`Delete ${file.name}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {isUploading && (
          <div className="flex min-w-40 items-center gap-2 rounded-lg border border-border bg-card/60 p-2 text-xs">
            <Loader2 className="size-3.5 animate-spin text-brand-blue" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">Uploading...</p>
              <p className="text-[10px] text-muted-foreground">Please wait</p>
            </div>
          </div>
        )}

        {files.length < maxFiles && onUploadFile && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex min-w-32 items-center gap-1.5 rounded-lg border border-dashed border-border bg-card/40 hover:bg-card hover:border-brand-blue/50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Paperclip className="size-3.5 text-slate-500" />
            <span>Attach image</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        disabled={disabled}
        multiple
      />
    </div>
  );
};
