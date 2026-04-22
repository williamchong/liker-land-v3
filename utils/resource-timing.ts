export type TTSCacheStatus = 'hit' | 'miss' | 'unknown'

const TTS_URL_PATTERN = /\/api\/reader\/tts(?:\?|$)/
const MAX_TRACKED_URLS = 200

const latestByURL = new Map<string, PerformanceResourceTiming>()
let observer: PerformanceObserver | null = null

function ensureObserver() {
  if (observer || typeof PerformanceObserver === 'undefined') return
  if (!PerformanceObserver.supportedEntryTypes?.includes('resource')) return
  const nextObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!TTS_URL_PATTERN.test(entry.name)) continue
      // delete+set so repeat URLs refresh their insertion order (LRU eviction)
      latestByURL.delete(entry.name)
      latestByURL.set(entry.name, entry as PerformanceResourceTiming)
      if (latestByURL.size > MAX_TRACKED_URLS) {
        const oldest = latestByURL.keys().next().value
        if (oldest) latestByURL.delete(oldest)
      }
    }
  })
  try {
    nextObserver.observe({ type: 'resource', buffered: true })
    observer = nextObserver
  }
  catch {
    // Environment accepts PerformanceObserver but not this entry type / buffered
  }
}

export function classifyTTSCacheStatus(audioURL: string): TTSCacheStatus {
  if (!audioURL || typeof PerformanceObserver === 'undefined') return 'unknown'
  ensureObserver()
  // Buffered observer entries flush asynchronously, so on the first call
  // fall back to a synchronous query against the browser's resource buffer.
  const entry = latestByURL.get(audioURL)
    ?? (performance.getEntriesByName(audioURL, 'resource').at(-1) as PerformanceResourceTiming | undefined)
  // decodedBodySize === 0 means cross-origin without Timing-Allow-Origin
  if (!entry || entry.decodedBodySize === 0) return 'unknown'
  return entry.transferSize === 0 ? 'hit' : 'miss'
}
