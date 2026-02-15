import { chunkByLines } from './chunking'
import { termFrequency, tokenize } from './tokenize'
import type { IndexedDocument, SearchResult } from './types'

export type TfIdfIndex = {
  docs: IndexedDocument[]
  search: (query: string, topK?: number, options?: { matchCase?: boolean; matchWholeWord?: boolean }) => SearchResult[]
}

const dot = (a: Map<string, number>, b: Map<string, number>) => {
  let s = 0
  for (const [k, av] of a) {
    const bv = b.get(k)
    if (bv) s += av * bv
  }
  return s
}

export function buildTfIdfIndex(files: Array<{ fileId: string; content: string }>, maxLinesPerChunk = 50): TfIdfIndex {
  const docs: IndexedDocument[] = []
  for (const f of files) docs.push(...chunkByLines(f.fileId, f.content, maxLinesPerChunk))

  const docTfs = docs.map((d) => termFrequency(tokenize(d.text)))
  const df = new Map<string, number>()
  for (const tf of docTfs) {
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1)
  }

  const N = docs.length || 1
  const docVecs = docTfs.map((tf) => {
    const v = new Map<string, number>()
    for (const [term, freq] of tf) {
      const idf = Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1
      v.set(term, freq * idf)
    }
    return v
  })

  const search = (query: string, topK = 8, options?: { matchCase?: boolean; matchWholeWord?: boolean }): SearchResult[] => {
    const qTokens = tokenize(query)

    // Expansion for Partial Match: Include all vocabulary terms that contain the query token
    // This allows "log" to match "logger" in TF-IDF phase
    let effectiveTokens = qTokens
    if (!options?.matchWholeWord) {
      const expanded = new Set(qTokens)
      for (const t of qTokens) {
        for (const term of df.keys()) {
          if (term.includes(t)) expanded.add(term)
        }
      }
      effectiveTokens = Array.from(expanded)
    }

    const qTf = termFrequency(effectiveTokens)
    const qVec = new Map<string, number>()
    for (const [term, freq] of qTf) {
      const idf = Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1
      qVec.set(term, freq * idf)
    }

    let scored: SearchResult[] = docs.map((doc, i) => {
      const score = dot(qVec, docVecs[i])
      return { doc, score }
    })

    scored = scored.filter((r) => r.score > 0)

    // Exact Match Filtering
    if (options?.matchCase || options?.matchWholeWord) {
      const flags = options.matchCase ? 'g' : 'gi'
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = options.matchWholeWord ? `\\b${safeQuery}\\b` : safeQuery
      const re = new RegExp(pattern, flags)

      scored = scored.filter(r => re.test(r.doc.text))
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }

  return { docs, search }
}
