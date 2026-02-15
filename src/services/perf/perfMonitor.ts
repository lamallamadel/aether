export type PerfMetrics = {
  longTaskCount: number
  longTaskMaxMs: number
  slowFrameCount: number
  slowFrameMaxMs: number
}

export const startPerfMonitor = (onUpdate: (m: PerfMetrics) => void) => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return () => {}

  let longTaskCount = 0
  let longTaskMaxMs = 0
  let slowFrameCount = 0
  let slowFrameMaxMs = 0

  let rafId = 0
  let last = performance.now()

  const tick = (t: number) => {
    const delta = t - last
    last = t
    if (delta > 16.7) {
      slowFrameCount += 1
      slowFrameMaxMs = Math.max(slowFrameMaxMs, delta)
    }
    rafId = window.requestAnimationFrame(tick)
  }
  rafId = window.requestAnimationFrame(tick)

  let flushTimer: number | null = null
  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      onUpdate({ longTaskCount, longTaskMaxMs, slowFrameCount, slowFrameMaxMs })
    }, 1000)
  }

  let observer: PerformanceObserver | null = null
  try {
    if (typeof PerformanceObserver !== 'undefined') {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const d = (entry as any).duration as number | undefined
          if (typeof d === 'number') {
            longTaskCount += 1
            longTaskMaxMs = Math.max(longTaskMaxMs, d)
          }
        }
        scheduleFlush()
      })
      observer.observe({ type: 'longtask', buffered: true } as any)
    }
  } catch {
    observer = null
  }

  scheduleFlush()

  return () => {
    if (flushTimer) window.clearTimeout(flushTimer)
    if (rafId) window.cancelAnimationFrame(rafId)
    if (observer) observer.disconnect()
  }
}

