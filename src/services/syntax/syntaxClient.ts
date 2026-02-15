import { workerBridge } from '../workers/WorkerBridge'
import type { SerializedTree, ExtractedSymbol } from './syntaxTypes'

type LanguageId = 'javascript' | 'typescript' | 'tsx'

export const parseFileContent = async (languageId: LanguageId, content: string) => {
  try {
    const res = await workerBridge.postRequest<{ tree: SerializedTree; symbols: ExtractedSymbol[] }>('PARSE', {
      languageId,
      content,
    })
    return res
  } catch (e) {
    console.warn('Syntax parsing failed', e)
    return { tree: null, symbols: [] }
  }
}


export const languageIdForFile = (fileId: string): LanguageId | null => {
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.ts')) return 'typescript'
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript'
  return null
}

