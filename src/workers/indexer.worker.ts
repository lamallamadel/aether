import { buildTfIdfIndex, type TfIdfIndex } from '../services/indexing/tfidfIndex'
import type { WorkerMessage, WorkerResponse } from '../services/workers/worker.types'

console.log('Indexer Worker: Script Loaded')

let index: TfIdfIndex | null = null

const post = (id: string, payload: any, error?: string) => {
  const response: WorkerResponse = { id, payload, error }
  self.postMessage(response)
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data
  console.log('Indexer Worker Received:', { id, type, payloadSummary: payload?.files?.length || payload?.query })
  try {
    if (type === 'INDEX_BUILD') {
      index = buildTfIdfIndex(payload.files)
      post(id, { docCount: index.docs.length })
      return
    }

    if (type === 'INDEX_SEARCH') {
      if (!index) {
        post(id, null, 'Index not built')
        return
      }
      const results = index.search(payload.query, payload.topK, payload.options).map((r) => ({
        fileId: r.doc.fileId,
        startLine: r.doc.startLine,
        endLine: r.doc.endLine,
        score: r.score,
        snippet: r.doc.text,
      }))
      post(id, { results })
      return
    }
  } catch (e) {
    post(id, null, String(e))
  }
}
