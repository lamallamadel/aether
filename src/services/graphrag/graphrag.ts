import type { ExtractedSymbol } from '../syntax/syntaxTypes'
import { getAllChunks, type RagChunkRecord, upsertChunks } from './graphragDb'
import { vectorStore } from '../db/VectorStore'


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

  // 1. Persist to GraphRAG DB (Legacy/Metadata)
  await upsertChunks(chunks)

  // 2. Persist to Vector Store (New Aksil Layer)
  const vectorChunks = chunks.map(c => ({
    content: c.text,
    startLine: c.startIndex, // Note: Transforming char index to line number would be better but keeping simple for now
    endLine: c.endIndex
  }))
  await vectorStore.persistVectors(fileId, vectorChunks)
}

export const graphragQuery = async (query: string, topK = 20) => {
  if (typeof indexedDB === 'undefined') return []

  // Parallel Search: Vector + Keyword with Timeout
  // We handle vector search failures gracefully (e.g. model download error)
  // And we enforce a 15s timeout to prevent UI hanging during model load
  const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]).catch(e => {
      console.error(`Operation timed out or failed: ${e}`)
      return fallback
    })
  }

  const [vectorResults, allChunks] = await Promise.all([
    withTimeout(vectorStore.search(query, topK), 15000, []),
    withTimeout(getAllChunks(), 5000, [])
  ])

  console.log('GraphRAG Debug:', {
    query,
    vectorResults: vectorResults.length,
    allChunks: allChunks.length
  })

  const qTokens = tokenize(query)

  // Combine Scores
  // We use a Map to merge results by ID
  const merged = new Map<string, { chunk: RagChunkRecord; score: number }>()

  // 1. Process Keyword Matches
  for (const chunk of allChunks) {
    const score = scoreText(qTokens, chunk.text)
    if (score > 0) {
      merged.set(chunk.id, { chunk, score })
    }
  }



  const results = []

  // Convert Vector Results to RagChunkRecord shape (approximate)
  for (const v of vectorResults) {
    results.push({
      chunk: {
        id: v.id,
        fileId: v.fileId,
        startIndex: v.startLine, // Mapped to startLine for now
        endIndex: v.endLine,
        text: v.content,
        symbols: v.tags || [],
        updatedAt: Date.now()
      } as RagChunkRecord,
      score: v.score * 2 // Boost vector score
    })
  }

  // Add Keyword Results if we need more filling
  if (results.length < topK) {
    const keywordSorted = [...merged.values()].sort((a, b) => b.score - a.score)
    for (const k of keywordSorted) {
      if (!results.find(r => r.chunk.text === k.chunk.text)) { // Dedup by text content
        results.push(k)
      }
      if (results.length >= topK) break
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK)
}

