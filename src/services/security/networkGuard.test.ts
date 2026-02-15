import { describe, expect, it } from 'vitest'
import { enableZeroEgress } from './networkGuard'

describe('networkGuard', () => {
  it('blocks outbound fetch in local mode', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response('ok', { status: 200 })) as any

    const disable = enableZeroEgress()
    await expect(fetch('https://example.com')).rejects.toThrow(/Zero-egress/i)
    await expect(fetch(`${window.location.origin}/api/ping`)).resolves.toBeInstanceOf(Response)
    disable()

    globalThis.fetch = original
  })
})

