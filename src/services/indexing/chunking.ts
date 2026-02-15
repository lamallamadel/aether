import type { IndexedDocument } from './types'

export function chunkByLines(fileId: string, content: string, maxLinesPerChunk = 50): IndexedDocument[] {
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
