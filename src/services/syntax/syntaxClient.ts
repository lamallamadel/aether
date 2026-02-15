import { wrap } from 'comlink'
import type { ExtractedSymbol, SerializedTree } from './syntaxTypes'

type LanguageId = 'javascript' | 'typescript' | 'tsx'

type SyntaxWorkerApi = {
  parse: (languageId: LanguageId, content: string) => Promise<{ tree: SerializedTree; symbols: ExtractedSymbol[] }>
}

let api: ReturnType<typeof wrap<SyntaxWorkerApi>> | null = null

const getApi = () => {
  if (api) return api
  if (typeof Worker === 'undefined') return null
  const worker = new Worker(new URL('../../workers/syntax.worker.ts', import.meta.url), { type: 'module' })
  api = wrap<SyntaxWorkerApi>(worker)
  return api
}

export const languageIdForFile = (fileId: string): LanguageId | null => {
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.ts')) return 'typescript'
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript'
  return null
}

export const parseSyntax = async (fileId: string, content: string) => {
  const lang = languageIdForFile(fileId)
  if (!lang) return null
  const client = getApi()
  if (!client) return null
  return client.parse(lang, content)
}
