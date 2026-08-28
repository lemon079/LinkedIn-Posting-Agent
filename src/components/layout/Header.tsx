import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface HeaderProps {
  onOpenSettings: () => void;
  disabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, disabled }) => (
  <header className="border-b border-border p-4 sm:p-5 bg-card sticky top-0 z-50 flex items-center justify-between shadow-level-1 animate-fade-in-up">
    <div className="flex items-center gap-2">
      <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
        <span className="text-brand-blue">Praxis</span>
      </h1>
    </div>
    <div className="flex items-center gap-3">
      <Button
        disabled={disabled}
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-foreground border border-outline-variant rounded-xl transition cursor-pointer"
      >
        <Settings className="size-3.5" /> <span className="hidden sm:inline">Configure Credentials</span>
      </Button>
    </div>
  </header>
);
