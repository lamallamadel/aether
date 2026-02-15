import type { ExtractedSymbol } from '../syntax/syntaxTypes'
import { getAllChunks, type RagChunkRecord, upsertChunks } from './graphragDb'

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(' ')
    .filter(Boolean)

const scoreText = (qTokens: string[], text: string) => {
  const hay = tokenize(text)
  if (hay.length === 0) return 0
  const freq = new Map<string, number>()
  for (const t of hay) freq.set(t, (freq.get(t) ?? 0) + 1)
  let score = 0
  for (const t of qTokens) score += (freq.get(t) ?? 0) / hay.length
  return score
}

export const buildChunksFromSymbols = (fileId: string, content: string, symbols: ExtractedSymbol[]) => {
  const out: RagChunkRecord[] = []
  const now = Date.now()
  const sorted = [...symbols].sort((a, b) => a.startIndex - b.startIndex)
  const maxChars = 2200
  for (const s of sorted) {
    const start = Math.max(0, s.startIndex)
    const end = Math.min(content.length, s.endIndex)
    if (end <= start) continue
    const text = content.slice(start, Math.min(end, start + maxChars))
    const id = `${fileId}:${start}:${end}`
    out.push({ id, fileId, startIndex: start, endIndex: end, text, symbols: [s.name], updatedAt: now })
  }

  if (out.length === 0) {
    const step = 1600
    for (let start = 0; start < content.length; start += step) {
      const end = Math.min(content.length, start + maxChars)
      const text = content.slice(start, end)
      const id = `${fileId}:${start}:${end}`
      out.push({ id, fileId, startIndex: start, endIndex: end, text, symbols: [], updatedAt: now })
    }
  }

  return out
}

export const ingestFile = async (fileId: string, content: string, symbols: ExtractedSymbol[]) => {
  if (typeof indexedDB === 'undefined') return
  const chunks = buildChunksFromSymbols(fileId, content, symbols)
  await upsertChunks(chunks)
}

export const graphragQuery = async (query: string, topK = 20) => {
  if (typeof indexedDB === 'undefined') return []
  const qTokens = tokenize(query)
  if (qTokens.length === 0) return []
  const all = await getAllChunks()
  const scored = all
    .map((c) => ({ chunk: c, score: scoreText(qTokens, c.text) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
  return scored
}

