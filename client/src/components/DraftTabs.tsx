import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Image } from "lucide-react";

interface DraftTabsProps {
  activeTab: "preview" | "edit";
  setActiveTab: (tab: "preview" | "edit") => void;
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
  isGeneratingImage: boolean;
  onGenerateImage: () => void;
}

export const DraftTabs: React.FC<DraftTabsProps> = ({
  activeTab, setActiveTab, imageUrl, setImageUrl, isGeneratingImage, onGenerateImage
}) => (
  <div className="flex items-center justify-between gap-4 flex-wrap">
    <div className="flex bg-slate-200/50 p-1 rounded-lg border border-border w-fit">
      <Button 
        className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${activeTab === "preview" ? "bg-brand-blue text-white" : "bg-transparent text-slate-500 hover:text-slate-700"}`} 
        onClick={() => setActiveTab("preview")}
      >
        <Eye className="size-3.5" /> LinkedIn Mockup
      </Button>
      <Button 
        className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${activeTab === "edit" ? "bg-brand-blue text-white" : "bg-transparent text-slate-500 hover:text-slate-700"}`} 
        onClick={() => setActiveTab("edit")}
      >
        <Edit3 className="size-3.5" /> Interactive Editor
      </Button>
    </div>
    <div className="flex items-center gap-2">
      <Button
        onClick={onGenerateImage}
        disabled={isGeneratingImage}
        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-lg transition cursor-pointer"
      >
        <Image className="size-3.5 text-indigo-600" />
        {isGeneratingImage ? "Generating..." : imageUrl ? "Regenerate Graphic" : "Generate AI Graphic"}
      </Button>
      {imageUrl && (
        <Button
          onClick={() => setImageUrl(null)}
          disabled={isGeneratingImage}
          className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-border rounded-lg transition cursor-pointer"
        >
          Remove Graphic
        </Button>
      )}
    </div>
  </div>
);
