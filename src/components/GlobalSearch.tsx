import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FileNode } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'
import { buildTfIdfIndex } from '../services/indexing/tfidfIndex'
import { graphragQuery } from '../services/graphrag/graphrag'
import { ThemedSelect } from './ThemedSelect'

type FlatFile = { fileId: string; name: string; parentId?: string; content: string }

type SearchMode = 'content' | 'filename' | 'knowledge'
type SearchScope = 'all' | 'open'

type ContentResult = {
  fileId: string
  startLine: number
  endLine: number
  score: number
}

const flattenFiles = (nodes: FileNode[]): FlatFile[] => {
  const out: FlatFile[] = []
  const visit = (n: FileNode) => {
    if (n.type === 'file') out.push({ fileId: n.id, name: n.name, parentId: n.parentId, content: n.content ?? '' })
    if (n.children) for (const c of n.children) visit(c)
  }
  for (const n of nodes) visit(n)
  return out
}

const extOf = (name: string) => {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase()
}

function buildSnippet(content: string, startLine: number, endLine: number) {
  const lines = content.split('\n')
  const start = Math.max(1, startLine)
  const end = Math.min(lines.length, endLine)
  const slice = lines.slice(start - 1, end)
  return slice.join('\n')
}

export function GlobalSearch() {
  const { globalSearchOpen, setGlobalSearchOpen, files, openFiles, openFile } = useEditorStore()
  const [mode, setMode] = useState<SearchMode>('content')
  const [scope, setScope] = useState<SearchScope>('all')
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<Record<string, boolean>>({ ts: true, tsx: true, json: true, md: true })
  const [results, setResults] = useState<
    Array<
      | FlatFile
      | (ContentResult & { name: string; parentId?: string; snippet: string })
      | { fileId: string; name: string; parentId?: string; snippet: string; score: number }
    >
  >([])
  const [status, setStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const pendingQueryRef = useRef<string>('')

  const flatFiles = useMemo(() => flattenFiles(files), [files])
  const fileById = useMemo(() => new Map(flatFiles.map((f) => [f.fileId, f])), [flatFiles])

  const typeFilter = useMemo(() => {
    const selected = new Set(Object.entries(types).filter(([, v]) => v).map(([k]) => k))
    return (f: FlatFile) => selected.size === 0 || selected.has(extOf(f.name))
  }, [types])

  const scopedFiles = useMemo(() => {
    const base = scope === 'open' ? flatFiles.filter((f) => openFiles.includes(f.fileId)) : flatFiles
    return base.filter(typeFilter)
  }, [flatFiles, openFiles, scope, typeFilter])

  useEffect(() => {
    if (!globalSearchOpen) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [globalSearchOpen])

  useEffect(() => {
    if (!globalSearchOpen) {
      setQuery('')
      setResults([])
      setStatus('idle')
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      return
    }

    if (mode !== 'content') return

    // Prefer a Web Worker for indexing/search to keep the UI responsive on large projects.
    if (typeof Worker === 'undefined') {
      setStatus('ready')
      return
    }

    if (workerRef.current) return

    setStatus('building')

    const worker = new Worker(new URL('../workers/indexer.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as
        | { type: 'built'; docCount: number }
        | { type: 'searchResult'; results: ContentResult[] }
        | { type: 'error'; message: string }
      if (msg.type === 'built') {
        setStatus('ready')
        if (pendingQueryRef.current.trim()) {
          worker.postMessage({ type: 'search', query: pendingQueryRef.current, topK: 50 })
        }
      } else if (msg.type === 'searchResult') {
        const mapped = msg.results
          .map((r) => {
            const f = fileById.get(r.fileId)
            if (!f) return null
            if (!typeFilter(f)) return null
            if (scope === 'open' && !openFiles.includes(f.fileId)) return null
            return {
              ...r,
              name: f.name,
              parentId: f.parentId,
              snippet: buildSnippet(f.content, r.startLine, r.endLine),
            }
          })
          .filter(Boolean) as Array<ContentResult & { name: string; parentId?: string; snippet: string }>
        setResults(mapped)
      } else if (msg.type === 'error') {
        setStatus('error')
      }
    }

    worker.postMessage({ type: 'build', files: flatFiles.map((f) => ({ fileId: f.fileId, content: f.content })) })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [fileById, flatFiles, globalSearchOpen, mode, openFiles, scope, typeFilter])

  useEffect(() => {
    if (!globalSearchOpen) return

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      pendingQueryRef.current = ''
      return
    }

    // Debounce typing to avoid spamming the worker / index.
    const t = window.setTimeout(() => {
      if (mode === 'filename') {
        const q = trimmed.toLowerCase()
        setResults(scopedFiles.filter((f) => f.name.toLowerCase().includes(q)))
        return
      }
      if (mode === 'knowledge') {
        graphragQuery(trimmed, 50).then((scored) => {
          const mapped = scored.map(({ chunk, score }) => {
            const f = fileById.get(chunk.fileId)
            const name = f?.name ?? chunk.fileId
            const parentId = f?.parentId
            const lines = chunk.text.split('\n').slice(0, 8).join('\n')
            return { fileId: chunk.fileId, name, parentId, snippet: lines, score }
          })
          setResults(mapped)
        })
        return
      }

      pendingQueryRef.current = trimmed

      if (workerRef.current && status === 'ready') {
        workerRef.current.postMessage({ type: 'search', query: trimmed, topK: 50 })
        return
      }

      // Fallback for environments without Worker support (e.g. unit tests).
      const index = buildTfIdfIndex(scopedFiles.map((f) => ({ fileId: f.fileId, content: f.content })))
      const mapped = index.search(trimmed, 50).map((r) => {
        const f = fileById.get(r.doc.fileId)
        return {
          fileId: r.doc.fileId,
          startLine: r.doc.startLine,
          endLine: r.doc.endLine,
          score: r.score,
          name: f?.name ?? r.doc.fileId,
          parentId: f?.parentId,
          snippet: buildSnippet(f?.content ?? '', r.doc.startLine, r.doc.endLine),
        }
      })
      setResults(mapped)
    }, 150)

    return () => window.clearTimeout(t)
  }, [fileById, globalSearchOpen, mode, query, scopedFiles, status])

  useEffect(() => {
    if (!globalSearchOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setGlobalSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [globalSearchOpen, setGlobalSearchOpen])

  if (!globalSearchOpen) return null

  const isContent = mode === 'content'
  const modeOptions = [
    { value: 'content' as const, label: 'Content' },
    { value: 'filename' as const, label: 'Filename' },
    { value: 'knowledge' as const, label: 'Knowledge' },
  ]
  const scopeOptions = [
    { value: 'all' as const, label: 'All files' },
    { value: 'open' as const, label: 'Open tabs' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global Search"
        className="w-[900px] max-w-[95vw] h-[70vh] bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 bg-[#111111]">
          <div className="text-xs font-bold tracking-wider text-gray-400 uppercase flex items-center gap-2">
            <Search size={14} className="text-gray-500" />
            <span>Global Search</span>
          </div>
          <button className="text-gray-500 hover:text-white" onClick={() => setGlobalSearchOpen(false)} type="button">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-white/5 bg-[#0c0c0c]">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'content' ? 'Search in file contents…' : mode === 'filename' ? 'Search file names…' : 'Search knowledge…'}
              className="flex-1 bg-[#1a1a1a] text-white text-sm rounded-md px-3 py-2 border border-white/5 focus:outline-none focus:border-purple-500/50"
            />
            <ThemedSelect<SearchMode>
              ariaLabel="Search mode"
              value={mode}
              options={modeOptions}
              onChange={(v) => setMode(v)}
              className="min-w-[140px]"
            />
            <ThemedSelect<SearchScope>
              ariaLabel="Search scope"
              value={scope}
              options={scopeOptions}
              onChange={(v) => setScope(v)}
              className="min-w-[140px]"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
            {(['ts', 'tsx', 'json', 'md'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypes((prev) => ({ ...prev, [t]: !prev[t] }))}
                className={`search-chip px-2 py-1 rounded border ${
                  types[t] ? 'bg-purple-600/20 border-purple-500/30 text-purple-200' : 'bg-white/5 border-white/10'
                }`}
              >
                .{t}
              </button>
            ))}
            <div className="ml-auto text-gray-500">
              {isContent ? (status === 'building' ? 'Indexing…' : status === 'ready' ? 'Indexed' : status) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {results.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500 text-sm">
              {query.trim() ? 'No results found' : 'Type a query to search'}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {results.map((r) => {
                if ('content' in r) {
                  const file = r as FlatFile
                  return (
                    <button
                      key={file.fileId}
                      type="button"
                      className="search-result-item w-full text-left px-6 py-4 hover:bg-white/5 transition-colors"
                      onClick={() => {
                        openFile(file.fileId)
                        setGlobalSearchOpen(false)
                      }}
                    >
                      <div className="text-sm text-white font-medium">{file.name}</div>
                      <div className="text-xs text-gray-600">{file.parentId}</div>
                    </button>
                  )
                }

                if ('startLine' in r) {
                  const res = r as ContentResult & { name: string; parentId?: string; snippet: string }
                  return (
                    <button
                      key={`${res.fileId}:${res.startLine}-${res.endLine}:${res.score}`}
                      type="button"
                      className="search-result-item w-full text-left px-6 py-4 hover:bg-white/5 transition-colors"
                      onClick={() => {
                        openFile(res.fileId)
                        setGlobalSearchOpen(false)
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm text-white font-medium truncate">
                            {res.name}
                            <span className="ml-2 text-xs text-gray-500">
                              L{res.startLine}-L{res.endLine}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 truncate">{res.parentId}</div>
                        </div>
                        <div className="text-xs text-gray-600 shrink-0">{Math.round(res.score * 100)}%</div>
                      </div>
                      <pre className="mt-2 text-xs text-gray-300 bg-black/20 border border-white/5 rounded p-2 overflow-x-auto no-scrollbar">
                        {res.snippet}
                      </pre>
                    </button>
                  )
                }

                const res = r as { fileId: string; name: string; parentId?: string; snippet: string; score: number }
                return (
                  <button
                    key={`${res.fileId}:${res.score}:${res.snippet.length}`}
                    type="button"
                    className="search-result-item w-full text-left px-6 py-4 hover:bg-white/5 transition-colors"
                    onClick={() => {
                      openFile(res.fileId)
                      setGlobalSearchOpen(false)
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium truncate">{res.name}</div>
                        <div className="text-xs text-gray-600 truncate">{res.parentId}</div>
                      </div>
                      <div className="text-xs text-gray-600 shrink-0">{Math.round(res.score * 100)}%</div>
                    </div>
                    <pre className="mt-2 text-xs text-gray-300 bg-black/20 border border-white/5 rounded p-2 overflow-x-auto no-scrollbar">
                      {res.snippet}
                    </pre>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
