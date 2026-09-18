import {
  TTS_AUDIO_CACHE,
  TTS_AUDIO_DOWNLOAD_CACHE,
  TTS_AUDIO_VERSION,
  TTS_AUDIO_VERSION_PARAM,
} from '~~/shared/constants/tts-cache'
import { stripID3v2Tag } from '~~/shared/utils/id3'

/**
 * Byte budget for downloaded TTS audio, separate from the book files' budget so
 * an audio sweep can never evict a book or vice versa. Roughly a book's worth of
 * audio per voice, so this holds about ten downloads. Lookahead is capped on
 * its own Workbox route.
 */
export const TTS_AUDIO_CACHE_MAX_BYTES = 500 * 1024 * 1024

/**
 * Nominal segment size, matching the figure the Workbox route is sized against.
 * The sweep only ever decides whether a whole tier is over budget, so counting
 * entries beats measuring them: the streaming playback path sets no
 * content-length, and reading bodies back to size them costs a full cache read.
 */
export const TTS_SEGMENT_ESTIMATE_BYTES = 30 * 1024

// Skip a recency write if the pin was already touched within this window.
const TTS_PIN_TOUCH_INTERVAL_MS = 60 * 1000

// CacheStorage reads and deletes are one backend round trip each; a whole pin is
// ~1500 of them, so they go out in batches rather than as one unbounded fan-out
// that the service worker's playback reads would queue behind.
const CACHE_BATCH_SIZE = 32

/**
 * A download is one book in one voice: switching voice invalidates it, because
 * voice is part of every segment URL and therefore of the cache entry.
 */
export type TTSPinIndex = LRUCacheIndex

/**
 * Pin id derived from the segment URL's own query params rather than from the
 * client's `languageVoice`. The two disagree for custom and affiliate voices,
 * where the voice id carries no language, so the URL is the only shape both the
 * download and the sweep can agree on.
 */
export function getTTSPinIdFromURL(rawURL: string): string | undefined {
  try {
    const { searchParams } = new URL(rawURL, 'http://localhost')
    const nftClassId = searchParams.get('nft_class_id')
    const language = searchParams.get('language')
    const voiceId = searchParams.get('voice_id')
    if (!nftClassId || !language || !voiceId) return undefined
    return `${normalizeNFTClassId(nftClassId)}:${language}:${voiceId}`
  }
  catch {
    return undefined
  }
}

export function getTTSPinIndexKey(cacheKeyPrefix: string): string {
  return [cacheKeyPrefix, TTS_AUDIO_CACHE, 'pins'].join('-')
}

const ttsPinIndex = createLRUCacheIndex({
  getIndexKey: getTTSPinIndexKey,
  touchIntervalMs: TTS_PIN_TOUCH_INTERVAL_MS,
})

export function readTTSPinIndex(cacheKeyPrefix: string): TTSPinIndex {
  return ttsPinIndex.read(cacheKeyPrefix)
}

/**
 * Segments per pin that the server rejected on its last full pass. Kept beside
 * the pin index rather than in it: that index is shared bookkeeping with the
 * book caches, and its record and touch rewrite whole entries.
 */
export function getTTSPinUnavailableKey(cacheKeyPrefix: string): string {
  return [cacheKeyPrefix, TTS_AUDIO_CACHE, 'pins-unavailable'].join('-')
}

function readTTSPinUnavailableIndex(cacheKeyPrefix: string): Record<string, number> {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getTTSPinUnavailableKey(cacheKeyPrefix)) || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(
      (entry): entry is [string, number] => Number.isFinite(entry[1]) && (entry[1] as number) > 0,
    ))
  }
  catch {
    return {}
  }
}

function writeTTSPinUnavailableIndex(cacheKeyPrefix: string, index: Record<string, number>) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const key = getTTSPinUnavailableKey(cacheKeyPrefix)
    if (Object.keys(index).length) window.localStorage.setItem(key, JSON.stringify(index))
    else window.localStorage.removeItem(key)
  }
  catch (error) {
    console.error(error)
  }
}

export function readTTSPinUnavailableCount(cacheKeyPrefix: string, pinId: string): number {
  return readTTSPinUnavailableIndex(cacheKeyPrefix)[pinId] ?? 0
}

/**
 * Record a completed download. `unavailable` is omitted by a cancelled run,
 * whose count is only a lower bound: the last full pass's count stands.
 */
export function recordTTSPin({
  cacheKeyPrefix,
  pinId,
  size,
  unavailable,
}: {
  cacheKeyPrefix: string
  pinId: string
  size: number
  unavailable?: number
}) {
  ttsPinIndex.record({ cacheKeyPrefix, key: pinId, size })
  if (unavailable === undefined) return
  const { [pinId]: _, ...index } = readTTSPinUnavailableIndex(cacheKeyPrefix)
  writeTTSPinUnavailableIndex(cacheKeyPrefix, unavailable > 0 ? { ...index, [pinId]: unavailable } : index)
}

/** Drop pins from the index, and whatever else is recorded against them. */
function removeTTSPinRecords(cacheKeyPrefix: string, pinIds: Iterable<string>) {
  const removed = new Set(pinIds)
  if (!removed.size) return
  ttsPinIndex.remove({ cacheKeyPrefix, keys: removed })
  const index = readTTSPinUnavailableIndex(cacheKeyPrefix)
  if (![...removed].some(pinId => pinId in index)) return
  writeTTSPinUnavailableIndex(
    cacheKeyPrefix,
    Object.fromEntries(Object.entries(index).filter(([pinId]) => !removed.has(pinId))),
  )
}

/** Bump recency so an actively replayed download is not evicted as stale. */
export function touchTTSPin({ cacheKeyPrefix, pinId }: { cacheKeyPrefix: string, pinId: string }) {
  // No upsert, unlike the book index: membership here means "downloaded", so
  // creating an entry would promote disposable lookahead into a protected pin.
  ttsPinIndex.touch({ cacheKeyPrefix, key: pinId })
}

/**
 * Downloads currently writing segments. Module scope, not composable state:
 * each useOfflineTTS() call owns its own refs, so a sweep started from one
 * instance would otherwise treat another's in-flight download as loose
 * lookahead and delete it — and the download would then record bytes for
 * segments that no longer exist, permanently overstating the pin.
 */
const inFlightDownloads = new Map<string, AbortController>()

/** Abort reason for a download whose audio was removed from under it. */
export const TTS_DOWNLOAD_REVOKED = 'tts-download-revoked'

/** Which pins a removal covers. */
type TTSRevokeTarget = { pinIds: string[] } | { prefix: string }

function getIsRevokeTarget(target: TTSRevokeTarget, pinId: string): boolean {
  return 'pinIds' in target ? target.pinIds.includes(pinId) : pinId.startsWith(target.prefix)
}

/**
 * Stop matching downloads before their audio is deleted: left running, one
 * could keep fetching or re-record its pin after the deletion.
 */
export function revokeTTSDownloads(target: TTSRevokeTarget) {
  for (const [pinId, controller] of inFlightDownloads) {
    if (getIsRevokeTarget(target, pinId)) controller.abort(TTS_DOWNLOAD_REVOKED)
  }
}

/**
 * Protect a pin for the duration of a download, and let a removal abort it
 * through `controller`. Returns the release callback.
 */
export function markTTSPinInFlight(pinId: string, controller = new AbortController()): () => void {
  inFlightDownloads.set(pinId, controller)
  return () => {
    if (inFlightDownloads.get(pinId) === controller) inFlightDownloads.delete(pinId)
  }
}

export function getIsTTSPinInFlight(pinId: string): boolean {
  return inFlightDownloads.has(pinId)
}

/** Whether a cached segment was fetched under the current TTS_AUDIO_VERSION. */
function getIsCurrentTTSAudioVersion(rawURL: string): boolean {
  const version = new URL(rawURL, 'http://localhost').searchParams.get(TTS_AUDIO_VERSION_PARAM)
  return (version ?? '') === TTS_AUDIO_VERSION
}

/** Every cache entry grouped by the pin it belongs to, read from the live cache. */
async function groupEntriesByPin(cache: Cache): Promise<Map<string, Request[]>> {
  const grouped = new Map<string, Request[]>()
  for (const request of await cache.keys()) {
    const pinId = getTTSPinIdFromURL(request.url) ?? ''
    const list = grouped.get(pinId) ?? []
    list.push(request)
    grouped.set(pinId, list)
  }
  return grouped
}

/**
 * Pins with downloaded audio present, so a badge never promises an evicted
 * download. Throws on a CacheStorage failure: an empty set would clear every badge.
 */
export async function getLiveTTSPinIds(): Promise<Set<string>> {
  if (typeof window === 'undefined' || !window.caches) return new Set()
  const cache = await window.caches.open(TTS_AUDIO_DOWNLOAD_CACHE)
  const live = new Set((await groupEntriesByPin(cache)).keys())
  live.delete('')
  return live
}

async function deleteEntries(cache: Cache, requests: Request[]) {
  for (let index = 0; index < requests.length; index += CACHE_BATCH_SIZE) {
    const batch = requests.slice(index, index + CACHE_BATCH_SIZE)
    await Promise.all(batch.map(request => cache.delete(request)))
  }
}

/**
 * Delete every segment whose pin matches, from both caches: lookahead for a
 * book and voice is the same local audio as its download. Returns the pins
 * still holding downloaded audio, for the caller's badge. Throws on a
 * CacheStorage failure: an empty set would read as a successful removal.
 */
async function removeTTSEntriesWhere({
  cacheKeyPrefix,
  target,
}: {
  cacheKeyPrefix: string
  target: TTSRevokeTarget
}): Promise<Set<string>> {
  if (typeof window === 'undefined' || !window.caches) return new Set()
  revokeTTSDownloads(target)
  const getIsTarget = (pinId: string) => getIsRevokeTarget(target, pinId)
  const live = new Set<string>()
  for (const cacheName of [TTS_AUDIO_CACHE, TTS_AUDIO_DOWNLOAD_CACHE]) {
    const cache = await window.caches.open(cacheName)
    for (const [pinId, requests] of await groupEntriesByPin(cache)) {
      if (!pinId) continue
      // Deleting a lookahead entry leaves its Workbox timestamp behind, which
      // counts against maxEntries until it ages out. Self-healing, so no more
      // than a note here.
      if (getIsTarget(pinId)) await deleteEntries(cache, requests)
      else if (cacheName === TTS_AUDIO_DOWNLOAD_CACHE) live.add(pinId)
    }
  }
  const keys = [
    ...Object.keys(readTTSPinIndex(cacheKeyPrefix)),
    ...Object.keys(readTTSPinUnavailableIndex(cacheKeyPrefix)),
  ].filter(getIsTarget)
  removeTTSPinRecords(cacheKeyPrefix, keys)
  return live
}

/** Drop whole downloads, e.g. on a voice switch or a user's remove. */
export async function removeTTSPins({
  cacheKeyPrefix,
  pinIds,
}: {
  cacheKeyPrefix: string
  pinIds: string[]
}): Promise<Set<string>> {
  if (!pinIds.length) return new Set()
  return removeTTSEntriesWhere({ cacheKeyPrefix, target: { pinIds } })
}

/**
 * The key Workbox stored a segment under: its `cacheKeyWillBeUsed` strips
 * `blocking`, which the native shell sets on every request, so matching the
 * request URL as-issued would miss every entry inside the app. Deliberately not
 * shared with that handler, which generateSW serialises via toString() — an
 * imported binding is out of scope there, and so is `window`.
 */
export function getTTSCacheKeyURL(rawURL: string): string {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  const url = new URL(rawURL, origin)
  url.searchParams.delete('blocking')
  return url.href
}

/**
 * Which of the given segment URLs are already stored, returned as the caller's
 * own URLs so it never has to normalize twice. One `keys()` walk rather than a
 * match per URL: a book runs to ~1200 segments and this wants membership, not
 * bodies.
 */
export async function getCachedTTSSegmentURLs(rawURLs: string[]): Promise<Set<string>> {
  if (typeof window === 'undefined' || !window.caches || !rawURLs.length) return new Set()
  try {
    // Downloads only: this is coverage, and lookahead is not a download.
    const cache = await window.caches.open(TTS_AUDIO_DOWNLOAD_CACHE)
    const stored = new Set((await cache.keys()).map(request => request.url))
    return new Set(rawURLs.filter(rawURL => stored.has(getTTSCacheKeyURL(rawURL))))
  }
  catch (error) {
    console.error(error)
    return new Set()
  }
}

/**
 * Cached MP3 frames for the given segment URLs, in the order asked for, with
 * each segment's own ID3 tag removed. Read by URL rather than by walking the
 * cache, whose keys are text-hashed and carry no playback order. A miss comes
 * back as undefined: a partial download is still worth exporting.
 */
export async function readTTSSegmentAudio(rawURLs: string[]): Promise<(Uint8Array | undefined)[]> {
  if (typeof window === 'undefined' || !window.caches) return rawURLs.map(() => undefined)
  try {
    // Downloads first, then whatever listening left behind.
    const cacheList = await Promise.all(
      [TTS_AUDIO_DOWNLOAD_CACHE, TTS_AUDIO_CACHE].map(name => window.caches.open(name)),
    )
    const frames: (Uint8Array | undefined)[] = []
    // Concurrent within a batch: every frame is retained either way, so
    // serialising saves no memory and only costs the user a spinner.
    for (let index = 0; index < rawURLs.length; index += CACHE_BATCH_SIZE) {
      const batch = rawURLs.slice(index, index + CACHE_BATCH_SIZE)
      frames.push(...await Promise.all(batch.map(async (rawURL) => {
        // ignoreVary mirrors the route that wrote these: edge copies minted
        // before that deploy carry `vary: Range` and would never match.
        const key = getTTSCacheKeyURL(rawURL)
        let response: Response | undefined
        for (const cache of cacheList) {
          response = await cache.match(key, { ignoreVary: true })
          if (response) break
        }
        return response ? stripID3v2Tag(new Uint8Array(await response.arrayBuffer())) : undefined
      })))
    }
    return frames
  }
  catch (error) {
    console.error(error)
    return rawURLs.map(() => undefined)
  }
}

/**
 * Drop every voice's audio for one book, e.g. when a borrow is returned. Covers
 * the playback lookahead as well as downloads: both are local bytes that would
 * otherwise outlive the access that produced them.
 */
export async function removeTTSPinsForBook({
  cacheKeyPrefix,
  nftClassId,
}: {
  cacheKeyPrefix: string
  nftClassId: string
}): Promise<Set<string>> {
  const prefix = `${normalizeNFTClassId(nftClassId)}:`
  return removeTTSEntriesWhere({ cacheKeyPrefix, target: { prefix } })
}

/**
 * Keep downloaded TTS audio under budget. Entries no pin claims (an index lost
 * to a localStorage clear) go first, then whole downloads, least-recently-opened
 * first, never `keepPinId`. Segments from before a TTS_AUDIO_VERSION bump are
 * dropped outright: nothing requests their URLs any more.
 *
 * Safe to call fire-and-forget. A failure is logged and returns undefined, never
 * an empty set, which would read as "no downloads" and clear every badge.
 */
export async function pruneTTSAudioCache({
  cacheKeyPrefix,
  keepPinId,
  maxBytes = TTS_AUDIO_CACHE_MAX_BYTES,
}: {
  cacheKeyPrefix: string
  keepPinId?: string
  maxBytes?: number
}): Promise<Set<string> | undefined> {
  if (typeof window === 'undefined' || !window.caches) return new Set()
  try {
    const cache = await window.caches.open(TTS_AUDIO_DOWNLOAD_CACHE)
    const snapshotAt = Date.now()
    const grouped = await groupEntriesByPin(cache)
    const stale: Request[] = []
    for (const [pinId, requests] of grouped) {
      const current = requests.filter((request) => {
        if (getIsCurrentTTSAudioVersion(request.url)) return true
        stale.push(request)
        return false
      })
      if (current.length === requests.length) continue
      if (current.length) grouped.set(pinId, current)
      else grouped.delete(pinId)
    }
    await deleteEntries(cache, stale)
    // A download in flight has entries but registers only on completion. Its
    // claim is read before the index and outlives its record, so a download
    // that finishes meanwhile shows up in one or the other.
    const protectedPinIds = new Set(inFlightDownloads.keys())
    // Read after the awaits, never passed in: another instance may have recorded
    // a pin and released its in-flight guard meanwhile, which a stale index would sweep.
    const stored = readTTSPinIndex(cacheKeyPrefix)

    // Reconcile: a pin whose entries are gone (a browser-level quota purge)
    // must leave the index, or the sweep budgets against bytes that don't exist.
    const index: TTSPinIndex = {}
    const dropped = new Set<string>()
    for (const [pinId, entry] of Object.entries(stored)) {
      if (grouped.has(pinId)) index[pinId] = entry
      // Recorded or opened since the snapshot, whose entries may postdate it:
      // left for the next sweep to judge.
      else if (entry.lastOpened > snapshotAt) protectedPinIds.add(pinId)
      else dropped.add(pinId)
    }

    // A download's recorded size covers only its last run's fetches, so a resumed
    // one records less than it holds. Count what is actually there, so those
    // bytes are neither invisible to the budget nor undeletable.
    const getGroupBytes = (pinId: string) =>
      (grouped.get(pinId)?.length ?? 0) * TTS_SEGMENT_ESTIMATE_BYTES
    let total = Object.entries(index)
      .reduce((sum, [pinId, entry]) => sum + Math.max(entry.size, getGroupBytes(pinId)), 0)

    // Protected bytes still count against the budget — they are on disk —
    // they are just never the ones freed.
    if (keepPinId) protectedPinIds.add(keepPinId)
    for (const pinId of protectedPinIds) {
      if (!index[pinId]) total += getGroupBytes(pinId)
    }

    const unpinned = [...grouped.entries()]
      .filter(([pinId]) => !protectedPinIds.has(pinId) && (!pinId || !index[pinId]))
      .flatMap(([, requests]) => requests)
    if (unpinned.length) {
      const unpinnedBytes = unpinned.length * TTS_SEGMENT_ESTIMATE_BYTES
      total += unpinnedBytes
      if (total > maxBytes) {
        await deleteEntries(cache, unpinned)
        total -= unpinnedBytes
      }
    }

    const evicted = new Set<string>()
    if (total > maxBytes) {
      const evictable = Object.entries(index)
        .filter(([pinId]) => !protectedPinIds.has(pinId))
        .sort((a, b) => a[1].lastOpened - b[1].lastOpened)
      for (const [pinId, entry] of evictable) {
        if (total <= maxBytes) break
        // Size the group before dropping it from `grouped`, or getGroupBytes
        // reads zero and the total under-subtracts, evicting more than needed.
        const freed = Math.max(entry.size, getGroupBytes(pinId))
        await deleteEntries(cache, grouped.get(pinId) ?? [])
        grouped.delete(pinId)
        evicted.add(pinId)
        total -= freed
      }
    }

    removeTTSPinRecords(cacheKeyPrefix, [...dropped, ...evicted])
    const live = new Set(grouped.keys())
    live.delete('')
    return live
  }
  catch (error) {
    console.error(error)
    return undefined
  }
}
