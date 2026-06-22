import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit3 } from "lucide-react";

interface DraftTabsProps {
  activeTab: "preview" | "edit";
  setActiveTab: (tab: "preview" | "edit") => void;
}

export const DraftTabs: React.FC<DraftTabsProps> = ({
  activeTab, setActiveTab
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
  </div>
);
