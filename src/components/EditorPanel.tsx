import React, { useRef, useState, useEffect, useMemo } from "react";
import { EditorReasoning } from "./EditorReasoning";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Trash2, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
  AttachmentGroup,
} from "@/components/ui/attachment";
import { LinkedInFeed } from "@/components/LinkedInFeed";

interface EditorPanelProps {
  draftText: string | null;
  streamingText: string | null;
  isGenerating: boolean;
  onStreamingComplete: () => void;
  isPublishing: boolean;
  selectedFiles: Array<{ name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }>;
  setSelectedFiles: React.Dispatch<React.SetStateAction<Array<{ name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }>>>;
  isUploading: boolean;
  onUploadFile: (file: File) => void;
  onChange: (value: string) => void;
  onPublish: () => void;
  reasoningSteps?: Array<{ title: string; output: string }>;
}

function SkeletonLine({ width, className }: { width: string; className?: string }) {
  return (
    <div
      className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 h-3.5 rounded-md bg-size-[300%_100%] animate-shimmer-sweep opacity-55",
        "bg-[linear-gradient(90deg,var(--color-surface-container)_0%,var(--color-surface-container)_40%,color-mix(in_oklch,var(--color-surface-container),var(--primary)_25%)_50%,var(--color-surface-container)_60%,var(--color-surface-container)_100%)]",
        "transition-opacity duration-150 ease-out",
        className
      )}
      style={{ width }}
    />
  );
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  draftText,
  streamingText,
  isGenerating,
  onStreamingComplete,
  isPublishing,
  selectedFiles,
  setSelectedFiles,
  isUploading,
  onUploadFile,
  onChange,
  onPublish,
  reasoningSteps,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [prevIsGenerating, setPrevIsGenerating] = useState(false);
  const [prevAnswerStarted, setPrevAnswerStarted] = useState(false);
  const [streamedLength, setStreamedLength] = useState(0);
  const [prevStreamingText, setPrevStreamingText] = useState<string | null>(null);

  const answerStarted = (draftText !== null && draftText !== "") || (streamingText !== null && streamingText !== "");

  // Sync state transitions:
  if (isGenerating && !prevIsGenerating) {
    setPrevIsGenerating(true);
    setIsAccordionOpen(true); // Open when generation starts
  }
  if (!isGenerating && prevIsGenerating) {
    setPrevIsGenerating(false);
  }

  if (answerStarted && !prevAnswerStarted) {
    setPrevAnswerStarted(true);
    setIsAccordionOpen(false); // Collapse when answer starts
  }
  if (!answerStarted && prevAnswerStarted) {
    setPrevAnswerStarted(false);
  }

  const isCurrentlyOpen = isAccordionOpen;

  if (streamingText !== prevStreamingText) {
    setPrevStreamingText(streamingText);
    setStreamedLength(0);
  }

  const isStreaming = streamingText !== null;

  // Split streamingText into 3 lines once it arrives
  const targetLines = useMemo(() => {
    const textToSplit = streamingText || "";
    if (!textToSplit) return ["", "", ""] as [string, string, string];
    const words = textToSplit.split(" ");
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
  }, [streamingText]);

  const totalLength = targetLines[0].length + targetLines[1].length + targetLines[2].length;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isStreaming || totalLength === 0) return;

    const interval = setInterval(() => {
      setStreamedLength((prev) => {
        if (prev < totalLength) {
          return prev + 1;
        } else {
          clearInterval(interval);
          timeoutRef.current = setTimeout(onStreamingComplete, 400);
          return prev;
        }
      });
    }, 6);

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isStreaming, totalLength, onStreamingComplete]);

  const line1 = targetLines[0].slice(0, Math.max(0, streamedLength));
  const line2 = targetLines[1].slice(0, Math.max(0, streamedLength - targetLines[0].length));
  const line3 = targetLines[2].slice(0, Math.max(0, streamedLength - targetLines[0].length - targetLines[1].length));

  const isStreamActive = isGenerating || streamingText !== null;
  const currentText = draftText ? draftText : (streamingText ? streamingText.slice(0, streamedLength) : "");
  const charCount = currentText.length;
  const pct = Math.min((charCount / 3000) * 100, 100);
  const strokeDashoffset = 100 - pct;

  const colorClass = charCount > 3000
    ? "text-red-600 stroke-red-600"
    : charCount > 2800
      ? "text-yellow-600 stroke-yellow-600"
      : "text-brand-blue stroke-brand-blue";

  const handleUploadedFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      alert("File size must be less than 4MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Unsupported file type. Please select a JPEG, PNG, or WebP image.");
      return;
    }

    onUploadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const availableSlots = 20 - selectedFiles.length;
    if (files.length > availableSlots) {
      alert(`You can only add up to ${availableSlots} more file(s).`);
    }
    files.slice(0, availableSlots).forEach(file => {
      handleUploadedFile(file);
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isControlsDisabled = isPublishing || isUploading || isStreamActive;

  return (
    <div className="space-y-4 bg-card border border-border p-5 rounded-2xl shadow-level-1">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Label htmlFor="draft-editor" className="text-sm font-semibold text-slate-700">Interactive Editor</Label>

        <div className="flex items-center gap-3">
          {/* Character counter */}
          <div
            className="flex items-center gap-2 text-xs"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Character count: ${charCount} out of 3000`}
          >
            <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <circle className="stroke-outline-variant" cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" />
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

          <div className="h-4 w-px bg-slate-200" />

          {/* Preview Button with Shadcn Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-semibold border-outline-variant hover:bg-surface-container gap-1.5 cursor-pointer"
                disabled={charCount === 0 || isStreamActive}
              >
                <Eye className="size-3.5" /> Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle></DialogTitle>
              </DialogHeader>
              <div className="pt-2">
                <LinkedInFeed draftText={currentText} selectedFiles={selectedFiles} />
              </div>
            </DialogContent>
          </Dialog>

          {/* Publish Button */}
          <Button
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-brand-blue hover:bg-brand-blue-hover text-white gap-1.5 shadow-sm duration-200 cursor-pointer"
            onClick={onPublish}
            disabled={isControlsDisabled || charCount > 3000 || charCount === 0}
            aria-busy={isPublishing ? "true" : "false"}
          >
            {isPublishing ? (
              <>Publishing...</>
            ) : isUploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Send className="size-3.5" /> Publish
              </>
            )}
          </Button>
        </div>
      </div>

      <EditorReasoning
        reasoningSteps={reasoningSteps}
        answerStarted={answerStarted}
        isCurrentlyOpen={isCurrentlyOpen}
        isAccordionOpen={isAccordionOpen}
        setIsAccordionOpen={setIsAccordionOpen}
      />

      {isStreamActive ? (
        /* Skeleton Overlay that matches standard Textarea styling exactly */
        <div className="w-full bg-card border border-border h-65 max-h-65 overflow-y-auto rounded-xl px-2.5 py-2 text-base md:text-sm leading-relaxed text-slate-900 relative flex flex-col gap-2.5">
          {/* Row 1 */}
          <div className="relative min-h-6 flex items-center">
            <SkeletonLine
              width="90%"
              className={cn(isStreaming ? "opacity-0 pointer-events-none" : "opacity-55")}
            />
            <p className="relative z-10 text-slate-800 font-sans leading-relaxed">
              {line1}
            </p>
          </div>

          {/* Row 2 */}
          <div className="relative min-h-6 flex items-center">
            <SkeletonLine
              width="72%"
              className={cn(isStreaming ? "opacity-0 pointer-events-none" : "opacity-55")}
            />
            <p className="relative z-10 text-slate-800 font-sans leading-relaxed">
              {line2}
            </p>
          </div>

          {/* Row 3 */}
          <div className="relative min-h-6 flex items-center">
            <SkeletonLine
              width="95%"
              className={cn(isStreaming ? "opacity-0 pointer-events-none" : "opacity-55")}
            />
            <p className="relative z-10 text-slate-800 font-sans leading-relaxed">
              {line3}
            </p>
          </div>
        </div>
      ) : (
        <Textarea
          id="draft-editor"
          className="w-full bg-card border-border h-65 max-h-65 overflow-y-auto resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-base md:text-sm leading-relaxed text-slate-900 transition-colors duration-200"
          value={draftText || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={isPublishing}
          aria-label="Interactive Draft Editor"
          aria-invalid={charCount > 3000 ? "true" : "false"}
        />
      )}

      {/* File Attachment Controls */}
      <div
        className="w-full"
        onDragOver={(e) => {
          if (isControlsDisabled) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (isControlsDisabled) return;
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files || []);
          const availableSlots = 20 - selectedFiles.length;
          if (files.length > availableSlots) {
            alert(`You can only add up to ${availableSlots} more file(s).`);
          }
          files.slice(0, availableSlots).forEach(file => {
            handleUploadedFile(file);
          });
        }}
      >
        {selectedFiles.length > 0 || isUploading ? (
          <AttachmentGroup className="w-full">
            {selectedFiles.map((file, idx) => {
              const isImage = file.type.startsWith("image/");
              const fileExt = file.type.split("/")[1]?.toUpperCase();
              return (
                <Dialog key={idx}>
                  <Attachment state="done" size="sm" className="animate-fade-in min-w-64">
                    <AttachmentMedia variant={isImage ? "image" : "icon"}>
                      {isImage ? (
                        <img src={file.readUrl || file.base64} alt="Preview" className="pointer-events-none" />
                      ) : (
                        <FileText className="size-5 text-red-500" />
                      )}
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{file.name}</AttachmentTitle>
                      <AttachmentDescription>{fileExt || "DOCUMENT"}</AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        aria-label={`Remove ${file.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        disabled={isPublishing}
                      >
                        <Trash2 className="size-3.5" />
                      </AttachmentAction>
                    </AttachmentActions>
                    <DialogTrigger asChild>
                      <AttachmentTrigger aria-label={`Preview ${file.name}`} />
                    </DialogTrigger>
                  </Attachment>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="truncate pr-6">{file.name}</DialogTitle>
                    </DialogHeader>
                    <div className="pt-2 flex flex-col items-center justify-center min-h-50">
                      <img
                        src={file.readUrl || file.base64}
                        alt={file.name}
                        className="max-w-full max-h-[60vh] object-contain rounded-lg border border-border shadow-sm"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}

            {isUploading && (
              <Attachment state="uploading" size="sm" className="min-w-64">
                <AttachmentMedia variant="icon">
                  <FileText className="size-5 text-slate-400" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Uploading...</AttachmentTitle>
                  <AttachmentDescription>Please wait</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            )}

            {selectedFiles.length < 20 && (
              <Attachment state="idle" size="sm" className="min-w-64 cursor-pointer">
                <AttachmentTrigger
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file"
                  disabled={isControlsDisabled}
                />
                <AttachmentMedia variant="icon">
                  <Paperclip className="size-4 text-slate-500" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Attach image</AttachmentTitle>
                  <AttachmentDescription>PNG, JPG up to 4MB</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            )}
          </AttachmentGroup>
        ) : (
          <Attachment state="idle" size="sm" className="min-w-64 cursor-pointer">
            <AttachmentTrigger
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              disabled={isControlsDisabled}
            />
            <AttachmentMedia variant="icon">
              <Paperclip className="size-4 text-slate-500" />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>Attach image</AttachmentTitle>
              <AttachmentDescription>PNG, JPG up to 4MB</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          disabled={isControlsDisabled}
          multiple
        />
      </div>
    </div>
  );
};