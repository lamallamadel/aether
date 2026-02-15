import { expose } from 'comlink'
import { Language, Parser } from 'web-tree-sitter'
import type { ExtractedSymbol, SerializedNode, SerializedTree } from '../services/syntax/syntaxTypes'

import coreWasmUrl from 'web-tree-sitter/tree-sitter.wasm?url'
import jsWasmUrl from 'tree-sitter-javascript/tree-sitter-javascript.wasm?url'
import tsWasmUrl from 'tree-sitter-typescript/tree-sitter-typescript.wasm?url'
import tsxWasmUrl from 'tree-sitter-typescript/tree-sitter-tsx.wasm?url'

type LanguageId = 'javascript' | 'typescript' | 'tsx'

let initialized = false
const languageCache = new Map<LanguageId, Language>()

const init = async () => {
  if (initialized) return
  await Parser.init({
    locateFile: () => coreWasmUrl,
  })
  initialized = true
}

const loadLanguage = async (languageId: LanguageId) => {
  await init()
  const cached = languageCache.get(languageId)
  if (cached) return cached
  const wasm = languageId === 'javascript' ? jsWasmUrl : languageId === 'tsx' ? tsxWasmUrl : tsWasmUrl
  const lang = await Language.load(wasm)
  languageCache.set(languageId, lang)
  return lang
}

const serializeNode = (node: import('web-tree-sitter').Node, maxDepth: number): SerializedNode => {
  const out: SerializedNode = {
    type: node.type,
    startIndex: node.startIndex,
    endIndex: node.endIndex,
    startPosition: node.startPosition,
    endPosition: node.endPosition,
  }
  if (maxDepth <= 0) return out
  const children = node.namedChildren.filter(Boolean) as import('web-tree-sitter').Node[]
  if (children.length) out.children = children.map((c) => serializeNode(c, maxDepth - 1))
  return out
}

const extractSymbols = (root: import('web-tree-sitter').Node, text: string): ExtractedSymbol[] => {
  const syms: ExtractedSymbol[] = []
  const visit = (node: import('web-tree-sitter').Node) => {
    const t = node.type
    if (t === 'function_declaration' || t === 'method_definition' || t === 'arrow_function') {
      const nameNode = node.childForFieldName('name')
      if (nameNode) {
        syms.push({ kind: 'function', name: text.slice(nameNode.startIndex, nameNode.endIndex), startIndex: node.startIndex, endIndex: node.endIndex })
      }
    } else if (t === 'class_declaration') {
      const nameNode = node.childForFieldName('name')
      if (nameNode) {
        syms.push({ kind: 'class', name: text.slice(nameNode.startIndex, nameNode.endIndex), startIndex: node.startIndex, endIndex: node.endIndex })
      }
    } else if (t === 'import_statement') {
      syms.push({ kind: 'import', name: 'import', startIndex: node.startIndex, endIndex: node.endIndex })
    } else if (t === 'export_statement') {
      syms.push({ kind: 'export', name: 'export', startIndex: node.startIndex, endIndex: node.endIndex })
    }
    for (const c of node.namedChildren) if (c) visit(c)
  }
  visit(root)
  return syms
}

const api = {
  parse: async (languageId: LanguageId, content: string) => {
    const lang = await loadLanguage(languageId)
    const parser = new Parser()
    parser.setLanguage(lang)
    const tree = parser.parse(content)
    if (!tree) return { tree: { languageId, root: { type: 'error', startIndex: 0, endIndex: 0, startPosition: { row: 0, column: 0 }, endPosition: { row: 0, column: 0 } } }, symbols: [] }
    const serialized: SerializedTree = {
      languageId,
      root: serializeNode(tree.rootNode, 6),
    }
    const symbols = extractSymbols(tree.rootNode, content)
    return { tree: serialized, symbols }
  },
}

expose(api)
