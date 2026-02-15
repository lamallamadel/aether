import { chunkByLines } from './chunking'
import { termFrequency, tokenize } from './tokenize'
import type { IndexedDocument, SearchResult } from './types'

export type TfIdfIndex = {
  docs: IndexedDocument[]
  search: (query: string, topK?: number) => SearchResult[]
}

const dot = (a: Map<string, number>, b: Map<string, number>) => {
  let s = 0
  for (const [k, av] of a) {
    const bv = b.get(k)
    if (bv) s += av * bv
  }
  return s
}

const norm = (a: Map<string, number>) => Math.sqrt(dot(a, a))

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

  const docNorms = docVecs.map((v) => norm(v) || 1)

  const search = (query: string, topK = 8): SearchResult[] => {
    const qTokens = tokenize(query)
    const qTf = termFrequency(qTokens)
    const qVec = new Map<string, number>()
    for (const [term, freq] of qTf) {
      const idf = Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1
      qVec.set(term, freq * idf)
    }
    const qNorm = norm(qVec) || 1

    const scored: SearchResult[] = docs.map((doc, i) => {
      const score = dot(qVec, docVecs[i]) / (qNorm * docNorms[i])
      return { doc, score }
    })

    return scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }

  return { docs, search }
}
