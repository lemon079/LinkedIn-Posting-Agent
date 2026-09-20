"use client";

import React from "react";
import { AssistantComposer } from "./assistant-ui/composer";
import type { BaseComposerProps } from "@/types/ui";

export type ControlPanelProps = BaseComposerProps;


export const ControlPanel: React.FC<ControlPanelProps> = ({
  customTopic,
  context,
  domain = "auto",
  archetype = "auto",
  tone = "conversational",
  isGenerating,
  setCustomTopic,
  setContext,
  setDomain,
  setArchetype,
  setTone,
  onGenerate,
}) => {
  return (
    <AssistantComposer
      customTopic={customTopic}
      context={context}
      domain={domain}
      archetype={archetype}
      tone={tone}
      isGenerating={isGenerating}
      setCustomTopic={setCustomTopic}
      setContext={setContext}
      setDomain={setDomain}
      setArchetype={setArchetype}
      setTone={setTone}
      onGenerate={onGenerate}
    />
  );
};
