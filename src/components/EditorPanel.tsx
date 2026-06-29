import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Trash2, FileText } from "lucide-react";

interface EditorPanelProps {
  draftText: string; 
  isPublishing: boolean;
  selectedFile: { name: string; type: string; base64: string; } | null;
  setSelectedFile: (file: { name: string; type: string; base64: string; } | null) => void;
  onChange: (value: string) => void; 
  onPublish: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  draftText, 
  isPublishing, 
  selectedFile,
  setSelectedFile,
  onChange, 
  onPublish,
}) => {
  const charCount = draftText.length;
  const pct = Math.min((charCount / 3000) * 100, 100);
  const strokeDashoffset = 100 - pct;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorClass = charCount > 3000
    ? "text-red-600 stroke-red-600"
    : charCount > 2800
      ? "text-yellow-600 stroke-yellow-600"
      : "text-brand-blue stroke-brand-blue";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("File size must be less than 4MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      alert("Unsupported file type. Please select a JPEG, PNG, WebP image, or PDF document.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setSelectedFile({
          name: file.name,
          type: file.type,
          base64: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
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
        className="w-full bg-card border-border min-h-[220px] rounded-xl focus-visible:ring-2 focus-visible:ring-brand-blue/20 focus-visible:border-brand-blue text-base md:text-sm leading-relaxed text-slate-900 transition-colors duration-200"
        value={draftText} onChange={(e) => onChange(e.target.value)}
        disabled={isPublishing}
      />

      {/* File Attachment Controls */}
      <div className="border border-border rounded-xl p-3 bg-slate-50/50 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Attachment (Optional)</span>
          {!selectedFile && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPublishing}
              className="text-xs text-brand-blue hover:text-brand-blue-hover font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Paperclip className="size-3.5" /> Attach Image or PDF
            </button>
          )}
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp, application/pdf"
          className="hidden"
          disabled={isPublishing}
        />

        {selectedFile ? (
          <div className="flex items-center justify-between bg-white border border-border p-2 rounded-lg shadow-xs animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedFile.type === "application/pdf" ? (
                <div className="p-2 bg-red-50 text-red-500 rounded-md">
                  <FileText className="size-5" />
                </div>
              ) : (
                <img
                  src={selectedFile.base64}
                  alt="Preview"
                  className="size-10 object-cover rounded-md border border-slate-100"
                />
              )}
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-slate-700 truncate max-w-[180px] sm:max-w-[280px]">
                  {selectedFile.name}
                </p>
                <p className="text-slate-400 font-medium uppercase text-[10px]">
                  {selectedFile.type.split("/")[1]}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={isPublishing}
              className="text-slate-400 hover:text-red-500 transition p-1.5 hover:bg-slate-50 rounded-md cursor-pointer disabled:opacity-50"
              aria-label="Remove attachment"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ) : (
          <p className="text-slate-400 text-xs text-center py-2 font-medium">
            No image or PDF document attached. (Max 4MB)
          </p>
        )}
      </div>

      <Button
        className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold py-5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm duration-200"
        onClick={onPublish} disabled={isPublishing || charCount > 3000 || charCount === 0}
      >
        {isPublishing ? "Publishing Post..." : <><Send className="size-4" /> Approve & Publish Post</>}
      </Button>
    </div>
  );
};
