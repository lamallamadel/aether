import { buildTfIdfIndex, type TfIdfIndex } from '../services/indexing/tfidfIndex'

type BuildMessage = { type: 'build'; files: Array<{ fileId: string; content: string }> }
type SearchMessage = { type: 'search'; query: string; topK?: number }

type OutMessage =
  | { type: 'built'; docCount: number }
  | { type: 'searchResult'; results: Array<{ fileId: string; startLine: number; endLine: number; score: number }> }
  | { type: 'error'; message: string }

let index: TfIdfIndex | null = null

const post = (msg: OutMessage) => {
  self.postMessage(msg)
}

self.onmessage = (event: MessageEvent<BuildMessage | SearchMessage>) => {
  const msg = event.data
  try {
    if (msg.type === 'build') {
      index = buildTfIdfIndex(msg.files)
      post({ type: 'built', docCount: index.docs.length })
      return
    }

    if (msg.type === 'search') {
      if (!index) {
        post({ type: 'error', message: 'Index not built' })
        return
      }
      const results = index.search(msg.query, msg.topK).map((r) => ({
        fileId: r.doc.fileId,
        startLine: r.doc.startLine,
        endLine: r.doc.endLine,
        score: r.score,
      }))
      post({ type: 'searchResult', results })
      return
    }
  } catch (e) {
    post({ type: 'error', message: String(e) })
  }
}
