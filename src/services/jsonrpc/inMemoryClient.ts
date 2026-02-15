import type { JsonRpcError, JsonRpcId, JsonRpcRequest } from './types'
import { InMemoryJsonRpcServer } from './inMemoryServer'

export class InMemoryJsonRpcClient {
  private seq = 0
  private readonly server: InMemoryJsonRpcServer

  constructor(server: InMemoryJsonRpcServer) {
    this.server = server
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    const id: JsonRpcId = ++this.seq
    const req: JsonRpcRequest = { jsonrpc: '2.0', id, method, params }
    const resp = await this.server.handle(req)
    if ('error' in resp) {
      const err = resp as JsonRpcError
      throw Object.assign(new Error(err.error.message), { code: err.error.code, data: err.error.data })
    }
    return resp.result as T
  }
}
