"use client";

import React from "react";
import { AssistantComposer } from "./assistant-ui/composer";
import type { BaseComposerProps } from "@/types/ui";

export type ControlPanelProps = BaseComposerProps;


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
