import { Bot, File, Menu, Search, Settings } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'

export function ActivityBar() {
  const { setCommandPaletteOpen, toggleAiPanel, setSettingsOpen, toggleSidebar } = useEditorStore()

  return (
    <div className="w-12 bg-[#111111] border-r border-white/5 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
      <button
        type="button"
        tabIndex={0}
        aria-label="Toggle Sidebar"
        onClick={toggleSidebar}
        className="p-2 bg-purple-600/20 text-purple-400 rounded-lg activity-item"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>
      <div className="w-6 h-[1px] bg-white/10 my-1"></div>
      <button
        type="button"
        tabIndex={0}
        aria-label="Explorer"
        onClick={toggleSidebar}
        className="p-2 text-white border-l-2 border-white activity-item"
      >
        <File size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        tabIndex={0}
        aria-label="Open Command Palette"
        onClick={() => setCommandPaletteOpen(true)}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Search size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        tabIndex={0}
        aria-label="Toggle AI Panel"
        onClick={toggleAiPanel}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Bot size={20} strokeWidth={1.5} />
      </button>
      <div className="flex-1"></div>
      <button
        type="button"
        tabIndex={0}
        aria-label="Open Settings"
        onClick={() => setSettingsOpen(true)}
        className="p-2 text-gray-500 hover:text-white transition-colors activity-item"
      >
        <Settings size={20} strokeWidth={1.5} />
      </button>
    </div>
  )
}
