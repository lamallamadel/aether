import { CornerDownLeft, Maximize2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../state/editorStore'

type ChatMessage = { role: 'user' | 'ai'; text: string }

export function AIChatPanel() {
  const { aiPanelVisible, toggleAiPanel } = useEditorStore()
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Hello! I am Aether AI. I can see your open files. How can I help you code today?' },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current) window.clearTimeout(t)
      timeoutsRef.current = []
    }
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMsg = input
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setInput('')
    setIsTyping(true)

    const t1 = window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Analyzing context...' }])

      const response = `Here is a suggestion for \`${userMsg}\`. \n\nI noticed you are working in App.tsx. Consider using useMemo for expensive calculations.`

      const t2 = window.setTimeout(() => {
        setMessages((prev) => {
          const newArr = [...prev]
          const last = newArr[newArr.length - 1]
          if (last && last.role === 'ai') {
            newArr[newArr.length - 1] = { ...last, text: response }
          }
          return newArr
        })
        setIsTyping(false)
      }, 1000)

      timeoutsRef.current.push(t2)
    }, 600)

    timeoutsRef.current.push(t1)
  }

  if (!aiPanelVisible) return null

  return (
    <div className="w-80 h-full bg-[#0c0c0c] border-l border-white/5 flex flex-col shrink-0 transition-all">
      <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Aether AI</span>
        </div>
        <button onClick={toggleAiPanel} className="text-gray-500 hover:text-white" type="button">
          <Maximize2 size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`
                max-w-[90%] p-3 rounded-lg text-sm leading-relaxed
                ${msg.role === 'user' ? 'bg-purple-900/20 text-purple-100 border border-purple-500/20' : 'bg-[#1a1a1a] text-gray-300 border border-white/5'}
              `}
            >
              {msg.text}
            </div>
            {msg.role === 'ai' && <div className="mt-1 text-[10px] text-gray-600 uppercase">Context Aware</div>}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-1 text-gray-500 text-xs ml-2">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce delay-75">●</span>
            <span className="animate-bounce delay-150">●</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-[#111111] border-t border-white/5">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder="Ask AI about your code (Ctrl+L)"
            className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-md p-3 pr-10 border border-white/5 focus:border-purple-500/50 focus:outline-none resize-none h-24 custom-scrollbar"
          />
          <button
            onClick={() => void sendMessage()}
            className="absolute bottom-2 right-2 p-1.5 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors"
            type="button"
          >
            <CornerDownLeft size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
