"use client";

import React from "react";
import { AssistantThread } from "./assistant-ui/thread";
import type { BaseThreadEditorProps } from "@/types/ui";

export interface EditorPanelProps extends BaseThreadEditorProps {
  onStreamingComplete: () => void;
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
  alternativeHooks,
  onApplyHook,
  draftVersions,
  activeVersionIndex,
  onUndo,
  onRedo,
  onSelectVersion,
  webSearchResults,
  isSearchingWeb,
  webSearchQuery,
  user,
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
      alternativeHooks={alternativeHooks}
      onApplyHook={onApplyHook}
      draftVersions={draftVersions}
      activeVersionIndex={activeVersionIndex}
      onUndo={onUndo}
      onRedo={onRedo}
      onSelectVersion={onSelectVersion}
      webSearchResults={webSearchResults}
      isSearchingWeb={isSearchingWeb}
      webSearchQuery={webSearchQuery}
      user={user}
    />
  );
};