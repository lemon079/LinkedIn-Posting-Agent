"use client";

import React from "react";
import { AssistantThread } from "./assistant-ui/thread";
import type { AssistantAttachmentItem } from "./assistant-ui/attachment";

export interface EditorPanelProps {
  draftText: string | null;
  streamingText: string | null;
  isGenerating: boolean;
  onStreamingComplete: () => void;
  isPublishing: boolean;
  selectedFiles: AssistantAttachmentItem[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<AssistantAttachmentItem[]>>;
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
  onDiscard,
  onRetry,
  onOpenSettings,
  error,
  onDismissError,
  reasoningSteps,
}) => {
  return (
    <AssistantThread
      draftText={draftText}
      streamingText={streamingText}
      isGenerating={isGenerating}
      onStreamingComplete={onStreamingComplete}
      isPublishing={isPublishing}
      selectedFiles={selectedFiles}
      setSelectedFiles={setSelectedFiles}
      isUploading={isUploading}
      onUploadFile={onUploadFile}
      onChange={onChange}
      onPublish={onPublish}
      onDiscard={onDiscard}
      onRetry={onRetry}
      onOpenSettings={onOpenSettings}
      error={error}
      onDismissError={onDismissError}
      reasoningSteps={reasoningSteps}
    />
  );
};