import { Bot, Split, X, Ghost } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'

export function StatusBar() {
  const { editorFontSizePx, perf, activeFileId } = useEditorStore()

  const languageLabel = activeFileId ? getLanguageLabel(activeFileId) : 'Plain Text'

  return (
    <div className="h-7 text-primary-100 font-semibold flex items-center justify-between px-4 text-xs select-none z-10" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          <Split size={12} />
          <span>master*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          <X size={12} className="rounded-full bg-primary-500/20 p-0.5" />
          <span>0 errors</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          16ms: LT {perf.longTaskCount} / {Math.round(perf.longTaskMaxMs)}ms
        </span>
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">Size: {editorFontSizePx}px</span>
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">UTF-8</span>
        <span className="hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">{languageLabel}</span>
        <span className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          <Ghost size={12} />
          <span>Aether Ghost Active</span>
        </span>
        <span className="flex items-center gap-1 hover:bg-primary-500/20 px-1.5 py-0.5 rounded cursor-pointer text-primary-100">
          <Bot size={12} />
          <span>Aether Copilot Ready</span>
        </span>
      </div>
    </div>
  )
}

function getLanguageLabel(fileId: string): string {
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.tsx')) return 'TypeScript React'
  if (lower.endsWith('.ts')) return 'TypeScript'
  if (lower.endsWith('.jsx')) return 'JavaScript React'
  if (lower.endsWith('.js')) return 'JavaScript'
  if (lower.endsWith('.json')) return 'JSON'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'Markdown'
  if (lower.endsWith('.css')) return 'CSS'
  if (lower.endsWith('.html')) return 'HTML'
  return 'Plain Text'
}
