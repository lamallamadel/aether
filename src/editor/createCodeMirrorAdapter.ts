import type { EditorView } from '@codemirror/view'
import type { EditorAdapter, SelectionRange, TextEdit } from './EditorAdapter'

export function createCodeMirrorAdapter(view: EditorView): EditorAdapter {
  return {
    getText: () => view.state.doc.toString(),
    setText: (text) => {
      const current = view.state.doc.toString()
      if (current === text) return
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    },
    applyEdits: (edits: TextEdit[]) => {
      view.dispatch({
        changes: edits.map((e) => ({ from: e.from, to: e.to, insert: e.insert })),
      })
    },
    focus: () => view.focus(),
    getSelection: () => {
      const r = view.state.selection.main
      return { from: r.from, to: r.to }
    },
    setSelection: (range: SelectionRange) => {
      view.dispatch({ selection: { anchor: range.from, head: range.to } })
    },
    onDidChangeText: () => () => {},
  }
}
