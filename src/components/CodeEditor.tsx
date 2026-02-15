import { history, historyKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, highlightSpecialChars, lineNumbers } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { useEffect, useMemo, useRef } from 'react'

const languageCompartment = new Compartment()
const wrapCompartment = new Compartment()
const themeCompartment = new Compartment()

function languageForFile(fileId: string | null) {
  if (!fileId) return null
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.js') || lower.endsWith('.jsx')) return javascript({ typescript: true })
  if (lower.endsWith('.json')) return json()
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return markdown()
  return null
}

export function CodeEditor(props: {
  fileId: string | null
  value: string
  onChange: (next: string) => void
  fontSizePx: number
  wordWrap: boolean
}) {
  const { fileId, value, onChange, fontSizePx, wordWrap } = props
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastValueRef = useRef<string>(value)
  const debounceRef = useRef<number | null>(null)

  const language = useMemo(() => languageForFile(fileId), [fileId])
  const baseTheme = useMemo(
    () =>
      EditorView.theme(
        {
          '&': {
            height: '100%',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            fontSize: `${fontSizePx}px`,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          },
          '.cm-content': { caretColor: '#ffffff' },
          '.cm-gutters': {
            backgroundColor: '#1e1e1e',
            color: '#6b7280',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          },
          '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)' },
          '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
          '.cm-selectionBackground': { backgroundColor: 'rgba(147, 51, 234, 0.30)' },
          '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(147, 51, 234, 0.35)' },
          '&.cm-focused': { outline: 'none' },
        },
        { dark: true }
      ),
    [fontSizePx]
  )

  useEffect(() => {
    if (!hostRef.current) return
    if (viewRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightSpecialChars(),
        drawSelection(),
        highlightActiveLine(),
        history(),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return
          const next = u.state.doc.toString()
          lastValueRef.current = next
          if (debounceRef.current) window.clearTimeout(debounceRef.current)
          debounceRef.current = window.setTimeout(() => onChange(next), 250)
        }),
        themeCompartment.of(baseTheme),
        wrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
        languageCompartment.of(language ? [language] : []),
      ],
    })

    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      view.destroy()
      viewRef.current = null
    }
  }, [baseTheme, language, onChange, value, wordWrap])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value && lastValueRef.current !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
      lastValueRef.current = value
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: languageCompartment.reconfigure(language ? [language] : []),
    })
  }, [language])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: themeCompartment.reconfigure(baseTheme) })
  }, [baseTheme])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: wrapCompartment.reconfigure(wordWrap ? EditorView.lineWrapping : []) })
  }, [wordWrap])

  return <div ref={hostRef} data-testid="code-editor" className="h-full w-full overflow-hidden" />
}
