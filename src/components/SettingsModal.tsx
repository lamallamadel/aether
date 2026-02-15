import { Check, Cloud, Monitor, Settings, Shield, Type, X } from 'lucide-react'
import { useEffect } from 'react'
import { useEditorStore } from '../state/editorStore'

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    editorFontSizePx,
    setEditorFontSizePx,
    editorMinimap,
    toggleEditorMinimap,
    editorWordWrap,
    toggleEditorWordWrap,
    aiMode,
    setAiMode,
  } = useEditorStore()

  useEffect(() => {
    if (!settingsOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setSettingsOpen, settingsOpen])

  if (!settingsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="w-[520px] max-w-[95vw] bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#151515]">
          <div className="flex items-center gap-2 font-medium">
            <Settings size={18} className="text-purple-400" />
            <span>Settings</span>
          </div>
          <button type="button" onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Editor</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Type size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">Font Size</div>
                  <div className="text-xs text-gray-500">Controls the editor font size in pixels.</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/20 rounded p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setEditorFontSizePx(Math.max(10, editorFontSizePx - 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-mono">{editorFontSizePx}</span>
                <button
                  type="button"
                  onClick={() => setEditorFontSizePx(Math.min(24, editorFontSizePx + 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <button type="button" className="w-full flex items-center justify-between" onClick={toggleEditorMinimap}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Monitor size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-200">Minimap</div>
                  <div className="text-xs text-gray-500">Controls whether the minimap is shown.</div>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full p-1 transition-colors ${editorMinimap ? 'bg-purple-600' : 'bg-white/10'}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editorMinimap ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </div>
            </button>

            <button type="button" className="w-full flex items-center justify-between" onClick={toggleEditorWordWrap}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Check size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-200">Word Wrap</div>
                  <div className="text-xs text-gray-500">Wrap lines that exceed viewport width.</div>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full p-1 transition-colors ${editorWordWrap ? 'bg-purple-600' : 'bg-white/10'}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editorWordWrap ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </div>
            </button>
          </div>

          <div className="h-px bg-white/5" />

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">AI & Privacy</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded text-gray-400">
                  <Shield size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">AI Mode</div>
                  <div className="text-xs text-gray-500">Local enforces zero-egress (blocks outbound network calls).</div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-black/20 rounded p-1 border border-white/5">
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-xs ${aiMode === 'cloud' ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30' : 'text-gray-300 hover:bg-white/10'}`}
                  onClick={() => setAiMode('cloud')}
                >
                  <span className="inline-flex items-center gap-1">
                    <Cloud size={12} />
                    Cloud
                  </span>
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-xs ${aiMode === 'local' ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30' : 'text-gray-300 hover:bg-white/10'}`}
                  onClick={() => setAiMode('local')}
                >
                  Local
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          <div className="text-center pt-2">
            <div className="text-xs text-gray-600">Aether Code v0.1.0 (Alpha)</div>
            <div className="text-[10px] text-gray-700 mt-1">Inspired by Cursor & Sublime Text</div>
          </div>
        </div>
      </div>
    </div>
  )
}
