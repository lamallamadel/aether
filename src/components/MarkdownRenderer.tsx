
import React, { useMemo } from 'react'
import { highlightCode, getTokenColor } from '../utils/syntaxHighlighter'

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const parts = useMemo(() => parseMarkdown(content), [content])

  return <div className="space-y-2">{parts}</div>
}

const parseMarkdown = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Code Block (```lang ... ```)
    const codeBlockMatch = remaining.match(/^```(\w+)?\n([\s\S]*?)```/)
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || 'text'
      const code = codeBlockMatch[2]
      nodes.push(
        <div key={key++} className="my-2 rounded-md overflow-hidden bg-[#1e1e1e] border border-white/10">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-white/5">
            <span className="text-xs text-gray-400">{language}</span>
             <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-[10px] text-gray-500 hover:text-white transition-colors"
             >
                Copy
             </button>
          </div>
          <pre className="p-3 text-sm font-mono overflow-x-auto custom-scrollbar">
            <code>
              {highlightCode(code).map((token, i) => (
                <span key={i} className={getTokenColor(token.type)}>
                  {token.content}
                </span>
              ))}
            </code>
          </pre>
        </div>
      )
      remaining = remaining.slice(codeBlockMatch[0].length)
      continue
    }
    
    // Inline Code (`...`)
    const inlineCodeMatch = remaining.match(/^`([^`]+)`/)
    if (inlineCodeMatch) {
        nodes.push(
            <code key={key++} className="px-1.5 py-0.5 mx-0.5 rounded bg-white/10 text-emerald-300 font-mono text-[90%] border border-white/5">
                {inlineCodeMatch[1]}
            </code>
        )
        remaining = remaining.slice(inlineCodeMatch[0].length)
        continue
    }

    // Bold (**...**)
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
       nodes.push(<strong key={key++} className="font-bold text-white">{boldMatch[1]}</strong>)
       remaining = remaining.slice(boldMatch[0].length)
       continue
    }

    // Italic (*...*)
    const italicMatch = remaining.match(/^\*([^*]+)\*/)
    if (italicMatch) {
       nodes.push(<em key={key++} className="italic text-gray-300">{italicMatch[1]}</em>)
       remaining = remaining.slice(italicMatch[0].length)
       continue
    }
    
    // Newline to <br>
    if (remaining.startsWith('\n')) {
        nodes.push(<br key={key++} />)
        remaining = remaining.slice(1)
        continue
    }

    // Regular Text
    // Consume until next special char or newline
    const textMatch = remaining.match(/^[^`*\n]+/)
    if (textMatch) {
        nodes.push(<span key={key++}>{textMatch[0]}</span>)
        remaining = remaining.slice(textMatch[0].length)
    } else {
        // Fallback catch-all for single char
        nodes.push(<span key={key++}>{remaining[0]}</span>)
        remaining = remaining.slice(1)
    }
  }

  return nodes
}
