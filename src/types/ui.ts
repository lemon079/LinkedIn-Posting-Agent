import type React from "react";
import type { MediaFileMetadata } from "./media";
import type { DraftVersion } from "./agent";

/**
 * Shared base props for topic composition across ControlPanel and AssistantComposer.
 */
export interface BaseComposerProps {
  customTopic: string;
  context: string;
  domain?: string;
  isGenerating: boolean;
  setCustomTopic: (val: string) => void;
  setContext: (val: string) => void;
  setDomain?: (val: string) => void;
  onGenerate: () => void;
}

/**
 * Shared base props for thread draft editing across EditorPanel and AssistantThread.
 */
export interface BaseThreadEditorProps {
  draftText: string | null;
  streamingText: string | null;
  isGenerating: boolean;
  onStreamingComplete?: () => void;
  isPublishing: boolean;
  selectedFiles: MediaFileMetadata[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<MediaFileMetadata[]>>;
  isUploading: boolean;
  onUploadFile: (file: File) => void;
  onChange: (value: string) => void;
  onPublish: () => void;
  onDiscard?: () => void;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  error?: string | Error | null;
  onDismissError?: () => void;
  reasoningSteps?: Array<{ title: string; output: string }>;
  alternativeHooks?: Array<{
    type: "metric" | "contrarian" | "incident" | "curiosity" | "question";
    hook: string;
    rationale: string;
  }>;
  onApplyHook?: (newHook: string) => void;
  draftVersions?: DraftVersion[];
  activeVersionIndex?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectVersion?: (index: number) => void;
}
