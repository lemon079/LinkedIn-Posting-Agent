"use client";

import React from "react";
import { AssistantComposer } from "./assistant-ui/composer";

export interface ControlPanelProps {
  customTopic: string;
  context: string;
  domain?: string;
  isGenerating: boolean;
  setCustomTopic: (val: string) => void;
  setContext: (val: string) => void;
  setDomain?: (val: string) => void;
  onGenerate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  customTopic,
  context,
  domain = "auto",
  isGenerating,
  setCustomTopic,
  setContext,
  setDomain,
  onGenerate,
}) => {
  return (
    <AssistantComposer
      customTopic={customTopic}
      context={context}
      domain={domain}
      isGenerating={isGenerating}
      setCustomTopic={setCustomTopic}
      setContext={setContext}
      setDomain={setDomain}
      onGenerate={onGenerate}
    />
  );
};
