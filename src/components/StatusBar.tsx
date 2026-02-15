import { Bot, Split, X } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'

export function StatusBar() {
  const { editorFontSizePx, perf } = useEditorStore()
  return (
    <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-xs select-none z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <Split size={12} />
          <span>master*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <X size={12} className="rounded-full bg-white/20 p-0.5" />
          <span>0 errors</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">
          16ms: LT {perf.longTaskCount} / {Math.round(perf.longTaskMaxMs)}ms
        </span>
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">Ln 12, Col 43</span>
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">Size: {editorFontSizePx}px</span>
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">UTF-8</span>
        <span className="hover:bg-white/10 px-1 rounded cursor-pointer">TypeScript React</span>
        <span className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <Bot size={12} />
          <span>Aether Copilot Ready</span>
        </span>
      </div>
    </div>
  )
}
