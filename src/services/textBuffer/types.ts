export interface TextBuffer {
  length: number
  getText: () => string
  insert: (offset: number, text: string) => TextBuffer
  delete: (startOffset: number, endOffsetExclusive: number) => TextBuffer
}

export type PieceSource = 'original' | 'add'

export type Piece = {
  source: PieceSource
  start: number
  length: number
}
