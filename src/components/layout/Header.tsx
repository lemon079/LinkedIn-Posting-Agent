import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, Cloud, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  onOpenSettings: () => void;
  onSignIn?: () => void;
  isAuthenticated?: boolean;
  disabled?: boolean;
  user?: User | null;
  liToken?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onSignIn,
  isAuthenticated = true,
  disabled,
  user,
  liToken,
}) => (
  <header className="border-b border-border px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-card sticky top-0 z-50 flex items-center justify-between gap-2 shadow-level-1 animate-fade-in-up">
    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
      <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5 shrink-0">
        <span className="text-brand-blue">Praxis</span>
      </h1>
      <span className="hidden sm:inline text-xs text-muted-foreground/80 font-medium truncate">
        LinkedIn Ghostwriter
      </span>
    </div>

    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
      {/* Cloud Sync Status Chip */}
      {user && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs shrink-0"
          title="Settings synchronized to cloud"
        >
          <Cloud className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Cloud Sync</span>
        </div>
      )}

      {/* LinkedIn Status Chip */}
      {liToken && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-full text-xs font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-2xs shrink-0"
          title="LinkedIn account connected"
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span className="hidden md:inline">LinkedIn Connected</span>
        </div>
      )}

      {!isAuthenticated ? (
        <Button
          type="button"
          onClick={onSignIn || onOpenSettings}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          <svg className="size-3.5 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45c-.9 0-1.63.73-1.63 1.63 0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63Z" />
          </svg>
          <span>Sign in<span className="hidden sm:inline"> with LinkedIn</span></span>
        </Button>
      ) : (
        <Button
          disabled={disabled}
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-foreground border border-outline-variant rounded-xl transition cursor-pointer shrink-0"
          title="Configure API Keys & LLM Credentials"
        >
          <Settings className="size-3.5" />
          <span className="hidden sm:inline">Configure Credentials</span>
        </Button>
      )}
    </div>
  </header>
);
