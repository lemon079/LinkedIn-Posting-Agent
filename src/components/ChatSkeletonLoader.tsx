"use client";

import React from "react";
import { AssistantThread } from "./assistant-ui/thread";

/**
 * @deprecated Legacy skeleton loader. Use AssistantThread from @/components/assistant-ui instead.
 */
export interface ChatSkeletonLoaderProps {
  text: string;
  onComplete?: () => void;
}

export const ChatSkeletonLoader: React.FC<ChatSkeletonLoaderProps> = ({ text, onComplete }) => {
  return (
    <AssistantThread
      draftText={null}
      streamingText={text}
      isGenerating={true}
      onStreamingComplete={onComplete || (() => {})}
      isPublishing={false}
      selectedFiles={[]}
      setSelectedFiles={() => {}}
      isUploading={false}
      onUploadFile={() => {}}
      onChange={() => {}}
      onPublish={() => {}}
    />
  );
};
