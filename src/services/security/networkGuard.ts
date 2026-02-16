type GuardState = {
  originalFetch?: typeof fetch
  originalXHROpen?: XMLHttpRequest['open']
  originalWebSocket?: typeof WebSocket
  originalSendBeacon?: Navigator['sendBeacon']
  originalImageSrc?: PropertyDescriptor
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

const BLOCKED_MSG = 'Zero-egress mode: network calls are disabled'

export const enableZeroEgress = () => {
  if (typeof window === 'undefined') return () => {}

  // Patch fetch
  if (!state.originalFetch && typeof window.fetch === 'function') {
    state.originalFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (!isAllowedUrl(url)) return Promise.reject(new Error(BLOCKED_MSG))
      return state.originalFetch!(input as any, init)
    }
  }

  // Patch XMLHttpRequest.open
  if (!state.originalXHROpen && typeof XMLHttpRequest !== 'undefined') {
    state.originalXHROpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
      const u = typeof url === 'string' ? url : url.toString()
      if (!isAllowedUrl(u)) throw new Error(BLOCKED_MSG)
      return state.originalXHROpen!.call(this, method, url as any, async ?? true, user ?? null, password ?? null)
    }
  }

  // Patch WebSocket
  if (!state.originalWebSocket && typeof WebSocket !== 'undefined') {
    state.originalWebSocket = WebSocket
    ;(window as any).WebSocket = function (url: string | URL, protocols?: string | string[]) {
      const u = typeof url === 'string' ? url : url.toString()
      if (!isAllowedUrl(u)) throw new Error(BLOCKED_MSG)
      return protocols ? new state.originalWebSocket!(url as any, protocols as any) : new state.originalWebSocket!(url as any)
    } as any
  }

  // Patch navigator.sendBeacon
  if (!state.originalSendBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    state.originalSendBeacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = (url: string, data?: BodyInit | null): boolean => {
      if (!isAllowedUrl(url)) {
        console.warn(BLOCKED_MSG + ' (sendBeacon)')
        return false
      }
      return state.originalSendBeacon!(url, data)
    }
  }

  // Patch Image.src setter to block cross-origin image loading used for data exfiltration
  if (!state.originalImageSrc && typeof Image !== 'undefined') {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
    if (descriptor && descriptor.set) {
      state.originalImageSrc = descriptor
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        set(value: string) {
          if (typeof value === 'string' && value.length > 0 && !isAllowedUrl(value)) {
            console.warn(BLOCKED_MSG + ' (Image.src)')
            return
          }
          descriptor.set!.call(this, value)
        },
        get() {
          return descriptor.get!.call(this)
        },
        configurable: true,
      })
    }
  }

  // Inject CSP meta tag as defense-in-depth
  injectCSPMeta()

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
    if (state.originalSendBeacon) {
      navigator.sendBeacon = state.originalSendBeacon
      state.originalSendBeacon = undefined
    }
    if (state.originalImageSrc) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', state.originalImageSrc)
      state.originalImageSrc = undefined
    }
    removeCSPMeta()
  }
}

const CSP_META_ID = 'aether-zero-egress-csp'

function injectCSPMeta() {
  if (typeof document === 'undefined') return
  if (document.getElementById(CSP_META_ID)) return
  const meta = document.createElement('meta')
  meta.id = CSP_META_ID
  meta.httpEquiv = 'Content-Security-Policy'
  // Defense-in-depth CSP for zero-egress mode:
  // - worker-src: blob: needed for Vite-bundled inline workers
  // - font-src: blob: needed for dynamically loaded @font-face
  // - style-src: blob: needed for dynamically injected stylesheets
  // - connect-src: 'self' blocks all external XHR/fetch (model downloads, etc.)
  // - script-src: blob: needed for Web Worker scripts bundled as blob URLs
  meta.content = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`,
    `style-src 'self' 'unsafe-inline' blob:`,
    `img-src 'self' data: blob:`,
    `connect-src 'self'`,
    `font-src 'self' data: blob:`,
    `worker-src 'self' blob:`,
  ].join('; ')
  document.head.appendChild(meta)
}

function removeCSPMeta() {
  if (typeof document === 'undefined') return
  const meta = document.getElementById(CSP_META_ID)
  if (meta) meta.remove()
}
