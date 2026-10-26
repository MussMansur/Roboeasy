import type { ReactNode } from 'react'

/**
 * Lesson text: paragraphs split by blank lines, "1. " numbered lists and
 * **bold**. Deliberately tiny — lesson content never contains HTML.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part))
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/)
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => /^\d+\.\s/.test(l)))
          return (
            <ol key={i} className="my-3 grid list-decimal gap-1 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\.\s/, ''))}</li>
              ))}
            </ol>
          )
        return (
          <p key={i} className="my-3 leading-relaxed">
            {inline(block)}
          </p>
        )
      })}
    </div>
  )
}
