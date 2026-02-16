import type { Piece, TextBuffer } from './types'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const assertRange = (start: number, end: number) => {
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('Invalid range')
  if (start < 0 || end < 0) throw new Error('Invalid range')
  if (end < start) throw new Error('Invalid range')
}

const piecesTextLength = (pieces: Piece[]) => pieces.reduce((acc, p) => acc + p.length, 0)

const normalizePieces = (pieces: Piece[]): Piece[] => {
  const out: Piece[] = []
  for (const p of pieces) {
    if (p.length <= 0) continue
    const last = out[out.length - 1]
    if (last && last.source === p.source && last.start + last.length === p.start) {
      last.length += p.length
      continue
    }
    out.push({ ...p })
  }
  return out
}

const splitPiecesAt = (pieces: Piece[], offset: number): Piece[] => {
  const out: Piece[] = []
  let cursor = 0
  for (const p of pieces) {
    const nextCursor = cursor + p.length
    if (offset <= cursor || offset >= nextCursor) {
      if (p.length > 0) out.push({ ...p })
    } else {
      const leftLen = offset - cursor
      const rightLen = p.length - leftLen
      if (leftLen > 0) out.push({ source: p.source, start: p.start, length: leftLen })
      if (rightLen > 0) out.push({ source: p.source, start: p.start + leftLen, length: rightLen })
    }
    cursor = nextCursor
  }
  return out
}

const deleteRange = (pieces: Piece[], start: number, endExclusive: number): Piece[] => {
  let split = splitPiecesAt(pieces, start)
  split = splitPiecesAt(split, endExclusive)

  const out: Piece[] = []
  let cursor = 0
  for (const p of split) {
    const nextCursor = cursor + p.length
    const overlaps = !(nextCursor <= start || cursor >= endExclusive)
    if (!overlaps) out.push(p)
    cursor = nextCursor
  }
  return normalizePieces(out)
}

const insertAt = (pieces: Piece[], offset: number, insertPiece: Piece): Piece[] => {
  const split = splitPiecesAt(pieces, offset)
  const out: Piece[] = []
  let cursor = 0
  let inserted = false
  for (const p of split) {
    if (!inserted && cursor === offset) {
      out.push(insertPiece)
      inserted = true
    }
    out.push(p)
    cursor += p.length
  }
  if (!inserted) out.push(insertPiece)
  return normalizePieces(out)
}

// Compact based on actual piece fragmentation, not op count.
// normalizePieces already merges adjacent same-source pieces, so piece count
// only grows when edits create non-adjacent fragments. A threshold on piece
// count directly measures fragmentation instead of using ops as a proxy.
const PIECE_COUNT_COMPACTION_THRESHOLD = 200
// Also compact if the add buffer grows too large relative to useful text,
// which means lots of dead/overwritten text is being retained.
const ADD_BUFFER_WASTE_RATIO = 3

export class PieceTableBuffer implements TextBuffer {
  readonly length: number

  private readonly original: string
  private readonly add: string
  private readonly pieces: Piece[]

  constructor(original: string, add: string, pieces: Piece[]) {
    this.original = original
    this.add = add
    this.pieces = normalizePieces(pieces)
    this.length = piecesTextLength(this.pieces)
  }

  static fromText(text: string): PieceTableBuffer {
    return new PieceTableBuffer(text, '', [{ source: 'original', start: 0, length: text.length }])
  }

  getText(): string {
    let out = ''
    for (const p of this.pieces) {
      const src = p.source === 'original' ? this.original : this.add
      out += src.slice(p.start, p.start + p.length)
    }
    return out
  }

  private needsCompaction(): boolean {
    // High piece fragmentation
    if (this.pieces.length >= PIECE_COUNT_COMPACTION_THRESHOLD) return true
    // Add buffer has too much dead text (wasted memory)
    if (this.add.length > 0 && this.length > 0 && this.add.length > this.length * ADD_BUFFER_WASTE_RATIO) return true
    return false
  }

  private maybeCompact(): PieceTableBuffer {
    if (!this.needsCompaction()) return this
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0
    const text = this.getText()
    const compacted = PieceTableBuffer.fromText(text)
    if (typeof performance !== 'undefined') {
      const dt = performance.now() - t0
      if (dt > 4) {
        console.warn(`PieceTableBuffer: compaction took ${dt.toFixed(1)}ms (pieces: ${this.pieces.length}, length: ${this.length})`)
      }
    }
    return compacted
  }

  insert(offset: number, text: string): TextBuffer {
    const safeOffset = clamp(offset, 0, this.length)
    if (!text) return this
    const addStart = this.add.length
    const nextAdd = this.add + text
    const nextPieces = insertAt(this.pieces, safeOffset, { source: 'add', start: addStart, length: text.length })
    const next = new PieceTableBuffer(this.original, nextAdd, nextPieces)
    return next.maybeCompact()
  }

  delete(startOffset: number, endOffsetExclusive: number): TextBuffer {
    const start = clamp(startOffset, 0, this.length)
    const end = clamp(endOffsetExclusive, 0, this.length)
    assertRange(start, end)
    if (start === end) return this
    const nextPieces = deleteRange(this.pieces, start, end)
    const next = new PieceTableBuffer(this.original, this.add, nextPieces)
    return next.maybeCompact()
  }
}
