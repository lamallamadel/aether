import { describe, expect, it } from 'vitest'
import { InMemoryJsonRpcClient } from './inMemoryClient'
import { InMemoryJsonRpcServer } from './inMemoryServer'
import { JSONRPC_ERROR } from './errors'

describe('InMemoryJsonRpc', () => {
  it('retourne un résultat', async () => {
    const server = new InMemoryJsonRpcServer()
    server.register('ping', () => ({ ok: true }))
    const client = new InMemoryJsonRpcClient(server)
    await expect(client.request('ping')).resolves.toEqual({ ok: true })
  })

  it('retourne une erreur structurée', async () => {
    const server = new InMemoryJsonRpcServer()
    server.register('boom', () => {
      throw Object.assign(new Error('Invalid params'), { code: JSONRPC_ERROR.INVALID_PARAMS, data: { field: 'x' } })
    })
    const client = new InMemoryJsonRpcClient(server)
    await expect(client.request('boom')).rejects.toMatchObject({ code: JSONRPC_ERROR.INVALID_PARAMS, data: { field: 'x' } })
  })
})
