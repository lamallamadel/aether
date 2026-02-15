import type { FileNode } from '../../domain/fileNode'
import { InMemoryJsonRpcServer } from '../jsonrpc/inMemoryServer'
import { JSONRPC_ERROR, makeError } from '../jsonrpc/errors'

type ListFilesParams = { limit?: number; offset?: number }
type ListFilesResult = { total: number; items: Array<{ id: string; name: string; parentId?: string }> }

type ReadFileParams = { fileId: string }
type ReadFileResult = { fileId: string; content: string }

const flattenFiles = (nodes: FileNode[]): Array<{ id: string; name: string; parentId?: string; content?: string }> => {
  const out: Array<{ id: string; name: string; parentId?: string; content?: string }> = []
  const visit = (n: FileNode) => {
    if (n.type === 'file') out.push({ id: n.id, name: n.name, parentId: n.parentId, content: n.content })
    if (n.children) for (const c of n.children) visit(c)
  }
  for (const n of nodes) visit(n)
  return out
}

export function createLocalProjectServer(getFiles: () => FileNode[]): InMemoryJsonRpcServer {
  const server = new InMemoryJsonRpcServer()

  server.register('project.listFiles', (params: unknown) => {
    const { limit = 50, offset = 0 } = (params ?? {}) as ListFilesParams
    const all = flattenFiles(getFiles()).map(({ id, name, parentId }) => ({ id, name, parentId }))
    const safeLimit = Math.max(0, Math.min(200, Number(limit) || 0))
    const safeOffset = Math.max(0, Number(offset) || 0)
    return { total: all.length, items: all.slice(safeOffset, safeOffset + safeLimit) } satisfies ListFilesResult
  })

  server.register('project.readFile', (params: unknown) => {
    const { fileId } = (params ?? {}) as ReadFileParams
    if (!fileId || typeof fileId !== 'string') {
      throw Object.assign(new Error('Invalid params'), {
        code: JSONRPC_ERROR.INVALID_PARAMS,
        data: makeError(JSONRPC_ERROR.INVALID_PARAMS, 'fileId is required'),
      })
    }
    const file = flattenFiles(getFiles()).find((f) => f.id === fileId)
    if (!file) {
      throw Object.assign(new Error('Not found'), {
        code: JSONRPC_ERROR.INVALID_PARAMS,
        data: makeError(JSONRPC_ERROR.INVALID_PARAMS, 'Unknown fileId', { fileId }),
      })
    }
    return { fileId, content: file.content ?? '' } satisfies ReadFileResult
  })

  return server
}
