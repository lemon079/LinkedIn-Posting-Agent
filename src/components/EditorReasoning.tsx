"use client";

import React from "react";
import { AssistantReasoning } from "./assistant-ui/reasoning";

export interface EditorReasoningProps {
  reasoningSteps?: Array<{ title: string; output: string }>;
  answerStarted?: boolean;
  isCurrentlyOpen?: boolean;
  isAccordionOpen?: boolean;
  setIsAccordionOpen?: (isOpen: boolean) => void;
}

export const EditorReasoning: React.FC<EditorReasoningProps> = ({
  reasoningSteps,
  answerStarted = false,
  isAccordionOpen,
}) => {
  return (
    <AssistantReasoning
      reasoningSteps={reasoningSteps}
      isStreaming={!answerStarted}
      defaultOpen={isAccordionOpen}
    />
  );
};
