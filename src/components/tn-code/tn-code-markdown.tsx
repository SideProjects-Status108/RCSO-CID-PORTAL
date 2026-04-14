'use client'

import ReactMarkdown from 'react-markdown'

/**
 * Renders TN Code AI output (markdown with ### headers and lists). HTML in source is escaped by react-markdown.
 */
export function TnCodeMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h3: ({ children }) => (
          <h3 className="mt-4 font-heading text-sm font-semibold tracking-wide text-text-primary first:mt-0">
            {children}
          </h3>
        ),
        ul: ({ children }) => (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-primary">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-text-primary">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        p: ({ children }) => (
          <p className="mt-2 text-sm leading-relaxed text-text-primary first:mt-0">{children}</p>
        ),
        strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
