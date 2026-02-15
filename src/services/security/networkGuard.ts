type GuardState = {
  originalFetch?: typeof fetch
  originalXHROpen?: XMLHttpRequest['open']
  originalWebSocket?: typeof WebSocket
}

const state: GuardState = {}

const isAllowedUrl = (url: string) => {
  try {
    const u = new URL(url, window.location.href)
    return u.origin === window.location.origin
  } catch {
    return false
  }
}

export const enableZeroEgress = () => {
  if (typeof window === 'undefined') return () => {}
  if (!state.originalFetch && typeof window.fetch === 'function') {
    state.originalFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (!isAllowedUrl(url)) return Promise.reject(new Error('Zero-egress mode: network calls are disabled'))
      return state.originalFetch!(input as any, init)
    }
  }

  if (!state.originalXHROpen && typeof XMLHttpRequest !== 'undefined') {
    state.originalXHROpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
      const u = typeof url === 'string' ? url : url.toString()
      if (!isAllowedUrl(u)) throw new Error('Zero-egress mode: network calls are disabled')
      return state.originalXHROpen!.call(this, method, url as any, async ?? true, user ?? null, password ?? null)
    }
  }

  if (!state.originalWebSocket && typeof WebSocket !== 'undefined') {
    state.originalWebSocket = WebSocket
    ;(window as any).WebSocket = function (url: string | URL, protocols?: string | string[]) {
      const u = typeof url === 'string' ? url : url.toString()
      if (!isAllowedUrl(u)) throw new Error('Zero-egress mode: network calls are disabled')
      return protocols ? new state.originalWebSocket!(url as any, protocols as any) : new state.originalWebSocket!(url as any)
    } as any
  }

  return () => {
    if (state.originalFetch) {
      window.fetch = state.originalFetch
      state.originalFetch = undefined
    }
    if (state.originalXHROpen) {
      XMLHttpRequest.prototype.open = state.originalXHROpen
      state.originalXHROpen = undefined
    }
    if (state.originalWebSocket) {
      ;(window as any).WebSocket = state.originalWebSocket
      state.originalWebSocket = undefined
    }
  }
}

