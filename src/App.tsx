import { useEffect } from 'react'
import { ActivityBar } from './components/ActivityBar'
import { AIChatPanel } from './components/AIChatPanel'
import { CommandPalette } from './components/CommandPalette'
import { EditorArea } from './components/EditorArea'
import { GlobalSearch } from './components/GlobalSearch'
import { MenuBar } from './components/MenuBar'
import { MissionControl } from './components/MissionControl'
import { SettingsModal } from './components/SettingsModal'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { useEditorStore } from './state/editorStore'
import { enableZeroEgress } from './services/security/networkGuard'
import { startPerfMonitor } from './services/perf/perfMonitor'

export default function App() {
  const { setCommandPaletteOpen, toggleSidebar, toggleAiPanel, setSettingsOpen, aiMode, setPerf } = useEditorStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      if (isEditable) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        toggleAiPanel()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCommandPaletteOpen, setSettingsOpen, toggleAiPanel, toggleSidebar])

  useEffect(() => {
    if (aiMode !== 'local') return
    const cleanup = enableZeroEgress()
    return () => cleanup()
  }, [aiMode])

  useEffect(() => {
    const stop = startPerfMonitor((m) => setPerf(m))
    return () => stop()
  }, [setPerf])

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <MenuBar />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />
        <EditorArea />
        <AIChatPanel />
      </div>
      <StatusBar />
      <CommandPalette />
      <GlobalSearch />
      <SettingsModal />
      <MissionControl />
    </div>
  )
}
