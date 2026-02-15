import type { IndexedDocument } from './types'
import { getEncoding } from 'js-tiktoken'

const enc = getEncoding('cl100k_base')

export function chunkByTokenLimit(fileId: string, content: string, maxTokensPerChunk = 500): IndexedDocument[] {
  const lines = content.split('\n')
  const docs: IndexedDocument[] = []

  let currentChunk: string[] = []
  let currentTokens = 0
  let startLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineTokens = enc.encode(line).length

    // If a single line is too long, we might need to handle it, but for now we just add it and overflow
    if (currentTokens + lineTokens > maxTokensPerChunk && currentChunk.length > 0) {
      // Push current chunk — use consistent 1-based line numbers
      const text = currentChunk.join('\n')
      docs.push({
        id: `${fileId}:${startLine + 1}-${i}`,
        fileId,
        startLine: startLine + 1,
        endLine: i, // i is exclusive end (last line index not included), consistent with startLine being 1-based start of next chunk
        text,
      })
      // Reset for next chunk
      currentChunk = []
      currentTokens = 0
      startLine = i
    }

    currentChunk.push(line)
    currentTokens += lineTokens
  }

  // Push last chunk
  if (currentChunk.length > 0) {
    const endLine = lines.length
    const text = currentChunk.join('\n')
    docs.push({
      id: `${fileId}:${startLine + 1}-${endLine}`,
      fileId,
      startLine: startLine + 1,
      endLine,
      text,
    })
  }

  return docs
}

export function chunkByLines(fileId: string, content: string, maxLinesPerChunk = 50): IndexedDocument[] {
  // Legacy support, or simple fallback
  const lines = content.split('\n')
  const docs: IndexedDocument[] = []
  for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
    const start = i
    const end = Math.min(lines.length, i + maxLinesPerChunk)
    const text = lines.slice(start, end).join('\n')
    docs.push({
      id: `${fileId}:${start + 1}-${end}`,
      fileId,
      startLine: start + 1,
      endLine: end,
      text,
    })
  }
  return docs
}

