export type TTSCacheStatus = 'hit' | 'miss' | 'unknown'

const TTS_URL_PATTERN = /\/api\/reader\/tts(?:\?|$)/
const MAX_TRACKED_URLS = 200

const latestByUrl = new Map<string, PerformanceResourceTiming>()
let observer: PerformanceObserver | null = null

function ensureObserver() {
  if (observer || typeof PerformanceObserver === 'undefined') return
  if (!PerformanceObserver.supportedEntryTypes?.includes('resource')) return
  const nextObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!TTS_URL_PATTERN.test(entry.name)) continue
      // delete+set so repeat URLs refresh their insertion order (LRU eviction)
      latestByUrl.delete(entry.name)
      latestByUrl.set(entry.name, entry as PerformanceResourceTiming)
      if (latestByUrl.size > MAX_TRACKED_URLS) {
        const oldest = latestByUrl.keys().next().value
        if (oldest) latestByUrl.delete(oldest)
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

export function classifyTTSCacheStatus(audioUrl: string): TTSCacheStatus {
  if (!audioUrl || typeof PerformanceObserver === 'undefined') return 'unknown'
  ensureObserver()
  const entry = latestByUrl.get(audioUrl)
  // decodedBodySize === 0 means cross-origin without Timing-Allow-Origin
  if (!entry || entry.decodedBodySize === 0) return 'unknown'
  return entry.transferSize === 0 ? 'hit' : 'miss'
}
