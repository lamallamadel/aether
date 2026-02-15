export type TextEdit = { from: number; to: number; insert: string }

export type SelectionRange = { from: number; to: number }

export interface EditorAdapter {
  getText: () => string
  setText: (text: string) => void
  applyEdits: (edits: TextEdit[]) => void
  focus: () => void
  getSelection: () => SelectionRange
  setSelection: (range: SelectionRange) => void
  onDidChangeText: (listener: (text: string) => void) => () => void
}

