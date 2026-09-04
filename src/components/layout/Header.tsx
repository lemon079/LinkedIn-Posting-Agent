import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, Cloud, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  onOpenSettings: () => void;
  disabled?: boolean;
  user?: User | null;
  liToken?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  disabled,
  user,
  liToken,
}) => (
  <header className="border-b border-border p-4 sm:p-5 bg-card sticky top-0 z-50 flex items-center justify-between shadow-level-1 animate-fade-in-up">
    <div className="flex items-center gap-2.5">
      <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
        <span className="text-brand-blue">Praxis</span>
      </h1>
      <span className="hidden sm:inline text-xs text-muted-foreground/80 font-medium">
        LinkedIn Ghostwriter
      </span>
    </div>

    <div className="flex items-center gap-2.5">
      {/* Cloud Sync Status Chip */}
      {user && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <Cloud className="size-3.5 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline">Cloud Sync</span>
        </div>
      )}

      {/* LinkedIn Status Chip */}
      {liToken && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-2xs">
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span className="hidden md:inline">LinkedIn Connected</span>
        </div>
      )}

      <Button
        disabled={disabled}
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-foreground border border-outline-variant rounded-xl transition cursor-pointer"
      >
        <Settings className="size-3.5" />
        <span className="hidden sm:inline">Configure Credentials</span>
      </Button>
    </div>
  </header>
);
