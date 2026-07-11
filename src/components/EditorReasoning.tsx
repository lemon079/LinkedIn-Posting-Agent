import React from "react";
import ReactMarkdown from "react-markdown";
import { Brain, ChevronDown } from "lucide-react";

interface EditorReasoningProps {
  reasoningSteps?: Array<{ title: string; output: string }>;
  answerStarted: boolean;
  isCurrentlyOpen: boolean;
  isAccordionOpen: boolean;
  setIsAccordionOpen: (isOpen: boolean) => void;
}

export const EditorReasoning: React.FC<EditorReasoningProps> = ({
  reasoningSteps,
  answerStarted,
  isCurrentlyOpen,
  isAccordionOpen,
  setIsAccordionOpen,
}) => {
  if (!reasoningSteps || reasoningSteps.length === 0) return null;

  const totalChars = reasoningSteps.reduce((acc, step) => acc + step.output.length, 0);
  const latestStep = reasoningSteps[reasoningSteps.length - 1];
  const previewText = latestStep?.output.substring(0, 60).replace(/\n/g, " ") + (latestStep?.output.length > 60 ? "..." : "");

  return (
    <div className="bg-white border border-slate-100 border-l-[3px] border-l-brand-blue rounded-xl p-4 transition-all duration-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            aria-expanded={isAccordionOpen}
            aria-controls="reasoning-content"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/20 rounded-md whitespace-nowrap"
          >
            <ChevronDown className={`size-4 transition-transform duration-300 ${isAccordionOpen ? "rotate-180" : ""}`} />
            <Brain className="size-4 text-brand-blue" />
            <span>
              {isAccordionOpen ? "Hide reasoning" : "Show reasoning"}
            </span>
          </button>

          {!isAccordionOpen && previewText && (
            <span className="text-sm text-slate-400 truncate opacity-70 italic ml-2">
              {previewText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          {totalChars > 0 && (
            <span className="text-xs font-medium text-slate-500 px-2.5 py-1 bg-slate-100/80 rounded-full">
              {totalChars.toLocaleString()} chars
            </span>
          )}
          {!answerStarted && (
            <div className="text-sm text-brand-blue font-medium">
              Thinking...
            </div>
          )}
        </div>
      </div>

      <div
        id="reasoning-content"
        className="grid transition-all duration-300 ease-in-out"
        style={{
          gridTemplateRows: isCurrentlyOpen ? "1fr" : "0fr",
          opacity: isCurrentlyOpen ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-4 space-y-6 max-h-[300px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {reasoningSteps.map((step, idx) => {
              const isThinking = step.title === "Model Thinking";
              return (
                <div key={idx} className="space-y-2">
                  {step.title && !isThinking && (
                    <h4 className="text-sm font-semibold text-slate-800">
                      {step.title}
                    </h4>
                  )}
                  <div className={`text-sm leading-relaxed wrap-break-word
                            ${isThinking ? 'text-brand-blue italic' : 'text-slate-500'}
                            [&_p]:mb-3 [&_p:last-child]:mb-0
                            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul>li]:mb-1
                            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                            [&_strong]:font-semibold [&_strong]:text-slate-800
                            [&_em]:italic
                            [&_h1]:font-semibold [&_h1]:text-slate-800 [&_h1]:mb-2
                            [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:mb-2
                            [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mb-2
                            [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_code]:text-xs
                            [&_pre]:bg-slate-100/50 [&_pre]:border [&_pre]:border-slate-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:mb-3
                            [&_blockquote]:border-l-[3px] [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500`}>
                    <ReactMarkdown>{step.output}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
