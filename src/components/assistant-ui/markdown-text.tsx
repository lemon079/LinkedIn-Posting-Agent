"use client";

import React, { memo } from "react";
import { MarkdownTextPrimitive, type MarkdownTextPrimitiveProps } from "@assistant-ui/react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@assistant-ui/react-markdown/styles/dot.css";
import { cn } from "@/lib/utils";

export interface MarkdownTextProps extends Omit<MarkdownTextPrimitiveProps, "children"> {
  className?: string;
  children?: React.ReactNode;
}

const MarkdownTextImpl = ({ className, children, ...props }: MarkdownTextProps) => {
  const commonClasses = cn(
    "aui-md text-sm leading-relaxed text-slate-800 dark:text-slate-200 wrap-break-word",
    "[&_p]:mb-3 [&_p:last-child]:mb-0",
    "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul>li]:mb-1",
    "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol>li]:mb-1",
    "[&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100",
    "[&_em]:italic",
    "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-slate-100 [&_h1]:mb-2",
    "[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100 [&_h2]:mb-2",
    "[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100 [&_h3]:mb-1.5",
    "[&_code]:bg-slate-100 dark:[&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_code]:text-xs",
    "[&_pre]:bg-slate-100/70 dark:[&_pre]:bg-slate-800/70 [&_pre]:border [&_pre]:border-slate-200 dark:[&_pre]:border-slate-700 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mb-3",
    "[&_blockquote]:border-l-[3px] [&_blockquote]:border-brand-blue [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-400 [&_blockquote]:mb-3",
    "[&_a]:text-brand-blue [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-brand-blue-hover",
    className
  );

  if (typeof children === "string") {
    return (
      <div className={commonClasses}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
      </div>
    );
  }

  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className={commonClasses}
      {...props}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
