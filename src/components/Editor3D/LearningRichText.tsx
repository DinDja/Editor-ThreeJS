"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { Children, type ReactNode } from "react";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { normalizeAiText } from "@/lib/learning/richText";

const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mt-3 mb-2 text-base font-bold text-emerald-100 first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-2 text-base font-bold text-emerald-100 first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2 mb-1 text-sm font-bold text-emerald-100 first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-2 mb-1 text-sm font-semibold text-emerald-100 first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-emerald-400/60 pl-3 text-neutral-300 italic">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-neutral-100">{children}</strong>,
  em: ({ children }) => <em className="text-neutral-300">{children}</em>,
  hr: () => <hr className="my-3 border-emerald-400/20" />,
  pre: ({ children }) => (
    <pre className="my-3 max-w-full overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs leading-5 text-emerald-50">
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }) => {
    const isCodeBlock = Boolean(className?.includes("language-"));
    return (
      <code
        className={
          isCodeBlock
            ? className
            : "rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.9em] text-emerald-200"
        }
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[20rem] border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-emerald-400/10 text-emerald-100">{children}</thead>,
  th: ({ children }) => <th className="border-b border-white/10 px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-white/5 px-3 py-2 align-top">{children}</td>,
  a: ({ children, href, ...props }) => (
    <a
      {...props}
      href={href}
      className="text-emerald-300 underline decoration-emerald-300/40 underline-offset-2 hover:text-emerald-200"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  input: ({ checked, ...props }) => (
    <input
      {...props}
      type="checkbox"
      checked={checked ?? false}
      readOnly
      className="mr-2 accent-emerald-400"
      aria-label={checked ? "Concluído" : "Pendente"}
    />
  ),
};

type LearningRichTextProps = {
  children: ReactNode;
  className?: string;
};

export function LearningRichText({ children, className }: LearningRichTextProps) {
  const content = normalizeAiText(
    Children.toArray(children)
      .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
      .join(""),
  );

  return (
    <div className={`learning-rich-text min-w-0 text-sm leading-6 text-neutral-200 ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
