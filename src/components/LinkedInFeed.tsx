import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import Image from "next/image";

interface FileItem {
  name: string;
  type: string;
  storagePath?: string;
  readUrl?: string;
  base64?: string;
}

interface LinkedInFeedProps {
  draftText: string | null;
  selectedFiles?: FileItem[] | null;
}

/** Responsive image mosaic — mirrors LinkedIn's own grid layout */
const ImageMosaic: React.FC<{ files: FileItem[] }> = ({ files }) => {
  const images = files.filter((f) => f.type.startsWith("image/"));
  const docs = files.filter((f) => !f.type.startsWith("image/"));
  const count = images.length;

  const imgSrc = (f: FileItem) => f.readUrl || f.base64 || "";

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

export const LinkedInFeed: React.FC<LinkedInFeedProps> = ({ draftText, selectedFiles }) => {
  if (!draftText) return null;

  const hasFiles = selectedFiles && selectedFiles.length > 0;

  return (
    <Card className="bg-card border border-border shadow-level-1 rounded-2xl overflow-hidden">
      {/* Scroll-capped body — header + content + images scroll together, stays in viewport */}
      <div className="overflow-y-auto max-h-[calc(100vh-14rem)] p-5 space-y-4">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-blue/20 shrink-0">
            PR
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-foreground">Praxis</h4>
            <p className="text-muted-foreground font-normal">Autonomous AI Technical Content Ghostwriter</p>
          </div>
        </div>

        {/* Post text */}
        <CardContent className="p-0 text-sm leading-relaxed text-foreground whitespace-pre-wrap select-text font-sans selection:bg-brand-blue/10">
          {draftText}
        </CardContent>

        {/* Attachments mosaic */}
        {hasFiles && <ImageMosaic files={selectedFiles!} />}
      </div>
    </Card>
  );
};
