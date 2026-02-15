import { JSONRPC_ERROR, makeError } from './errors'
import type { JsonRpcRequest, JsonRpcResponse } from './types'

export type JsonRpcHandler = (params: unknown) => unknown | Promise<unknown>

export class InMemoryJsonRpcServer {
  private readonly handlers = new Map<string, JsonRpcHandler>()

  register(method: string, handler: JsonRpcHandler) {
    this.handlers.set(method, handler)
  }

  async handle(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (req.jsonrpc !== '2.0' || !req.method) {
      return { jsonrpc: '2.0', id: req.id, error: makeError(JSONRPC_ERROR.INVALID_REQUEST, 'Invalid Request') }
    }

    const handler = this.handlers.get(req.method)
    if (!handler) {
      return { jsonrpc: '2.0', id: req.id, error: makeError(JSONRPC_ERROR.METHOD_NOT_FOUND, 'Method not found') }
    }

    try {
      const result = await handler(req.params)
      return { jsonrpc: '2.0', id: req.id, result }
    } catch (e) {
      if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'number') {
        const err = e as { code: number; message?: string; data?: unknown }
        return { jsonrpc: '2.0', id: req.id, error: makeError(err.code, err.message ?? 'Error', err.data) }
      }
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: makeError(JSONRPC_ERROR.INTERNAL_ERROR, 'Internal error', { message: String(e) }),
      }
    }
  }
}
