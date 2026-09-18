import { beforeEach, describe, expect, it } from 'vitest'
import { TTS_AUDIO_CACHE, TTS_AUDIO_DOWNLOAD_CACHE } from '~~/shared/constants/tts-cache'
import { buildID3v2Tag } from '~~/shared/utils/id3'
import {
  getCachedTTSSegmentURLs,
  getLiveTTSPinIds,
  getTTSCacheKeyURL,
  getTTSPinIdFromURL,
  getTTSPinIndexKey,
  markTTSPinInFlight,
  pruneTTSAudioCache,
  readTTSPinIndex,
  readTTSPinUnavailableCount,
  readTTSSegmentAudio,
  recordTTSPin,
  removeTTSPins,
  removeTTSPinsForBook,
  revokeTTSDownloads,
  touchTTSPin,
  TTS_DOWNLOAD_REVOKED,
} from '~/utils/tts-audio-cache'

const PREFIX = 'test'

// Mirrors TTS_SEGMENT_ESTIMATE_BYTES: the sweep counts entries rather than
// measuring them, so budgets in these tests are expressed in whole segments.
const SEGMENT = 30 * 1024

function buildSegmentURL({ nftClassId, language, voiceId, text }: {
  nftClassId: string
  language: string
  voiceId: string
  text: string
}) {
  return `https://3ook.com/api/reader/tts?text=${text}&language=${language}&voice_id=${voiceId}&nft_class_id=${nftClassId}&sig=x`
}

function buildSegmentURLs({ nftClassId, count }: { nftClassId: string, count: number }) {
  return Array.from({ length: count }, (_, index) => buildSegmentURL({
    nftClassId, language: 'zh-HK', voiceId: 'v', text: String(index),
  }))
}

/**
 * Minimal CacheStorage stand-in: enough surface for the sweep's keys/delete.
 * `urls` are downloads; `lookaheadURLs` sit in the Workbox lookahead cache.
 */
function installFakeCaches(
  urls: string[],
  bodyByURL?: Map<string, Uint8Array>,
  lookaheadURLs: string[] = [],
) {
  function createCache(store: Set<string>) {
    return {
      keys: async () => [...store].map(url => new Request(url)),
      match: async (key: string) => {
        const body = store.has(key) ? bodyByURL?.get(key) : undefined
        return body ? new Response(body) : undefined
      },
      delete: async (request: Request) => store.delete(request.url),
    }
  }
  const store = new Set<string>(urls)
  const lookahead = new Set<string>(lookaheadURLs)
  const cacheByName = new Map([
    [TTS_AUDIO_DOWNLOAD_CACHE, createCache(store)],
    [TTS_AUDIO_CACHE, createCache(lookahead)],
  ])
  ;(window as unknown as { caches: unknown }).caches = { open: async (name: string) => cacheByName.get(name) }
  return Object.assign(store, { lookahead })
}

/** CacheStorage that fails on every open, as a quota or storage error would. */
function installFailingCaches() {
  ;(window as unknown as { caches: unknown }).caches = {
    open: async () => { throw new Error('quota') },
  }
}

describe('tts-audio-cache', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('getTTSPinIdFromURL', () => {
    it('derives a pin id from the segment URL query params', () => {
      expect(getTTSPinIdFromURL(buildSegmentURL({
        nftClassId: '0xABC', language: 'zh-HK', voiceId: 'phoebe_v28', text: 'a',
      }))).toBe('0xabc:zh-HK:phoebe_v28')
    })

    it('gives one book two pins across two voices', () => {
      const base = { nftClassId: '0xABC', language: 'zh-HK', text: 'a' }
      expect(getTTSPinIdFromURL(buildSegmentURL({ ...base, voiceId: 'phoebe_v28' })))
        .not.toBe(getTTSPinIdFromURL(buildSegmentURL({ ...base, voiceId: 'karenly' })))
    })

    it('survives the blocking param the Workbox cache key strips', () => {
      const withBlocking = `${buildSegmentURL({
        nftClassId: '0xABC', language: 'zh-HK', voiceId: 'v', text: 'a',
      })}&blocking=1`
      expect(getTTSPinIdFromURL(withBlocking)).toBe('0xabc:zh-HK:v')
    })

    it('returns undefined when the URL is not a TTS segment', () => {
      expect(getTTSPinIdFromURL('https://3ook.com/api/reader/tts?text=a')).toBeUndefined()
      expect(getTTSPinIdFromURL('not a url at all ://')).toBeUndefined()
    })
  })

  describe('pin index', () => {
    it('records and reads back a pin', () => {
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'a:zh-HK:v', size: 100 })
      expect(readTTSPinIndex(PREFIX)['a:zh-HK:v']).toMatchObject({ size: 100 })
    })

    it('drops entries with a non-finite size so the sweep total cannot become NaN', () => {
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        good: { size: 10, lastOpened: 1 },
        bad: { size: 'x', lastOpened: 1 },
      }))
      expect(Object.keys(readTTSPinIndex(PREFIX))).toEqual(['good'])
    })

    it('survives corrupt json', () => {
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), '{oops')
      expect(readTTSPinIndex(PREFIX)).toEqual({})
    })

    it('does not bump recency within the touch interval', () => {
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p', size: 1 })
      const before = readTTSPinIndex(PREFIX).p!.lastOpened
      touchTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p' })
      expect(readTTSPinIndex(PREFIX).p!.lastOpened).toBe(before)
    })

    it('keeps the unavailable count until a full pass replaces it', () => {
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p', size: 1, unavailable: 2 })
      // A cancelled resume omits the count: the full pass's figure stands.
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p', size: 1 })
      expect(readTTSPinUnavailableCount(PREFIX, 'p')).toBe(2)
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p', size: 1, unavailable: 0 })
      expect(readTTSPinUnavailableCount(PREFIX, 'p')).toBe(0)
    })

    it('bumps recency for a pin last opened long ago', () => {
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        p: { size: 1, lastOpened: 1 },
      }))
      touchTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'p' })
      expect(readTTSPinIndex(PREFIX).p!.lastOpened).toBeGreaterThan(1)
    })
  })

  describe('pruneTTSAudioCache', () => {
    it('drops segments no pin claims before touching any download', async () => {
      const [pinned] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const [loose] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([pinned!, loose!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 1.5 })

      expect(store.has(loose!)).toBe(false)
      expect(store.has(pinned!)).toBe(true)
      expect(readTTSPinIndex(PREFIX)['0xa:zh-HK:v']).toBeDefined()
    })

    it('evicts the least-recently-opened download and never the current one', async () => {
      const [old] = buildSegmentURLs({ nftClassId: '0xOLD', count: 1 })
      const [kept] = buildSegmentURLs({ nftClassId: '0xNEW', count: 1 })
      const store = installFakeCaches([old!, kept!])
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        '0xold:zh-HK:v': { size: SEGMENT, lastOpened: 1 },
        '0xnew:zh-HK:v': { size: SEGMENT, lastOpened: 2 },
      }))

      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 1.5, keepPinId: '0xnew:zh-HK:v',
      })

      expect(store.has(old!)).toBe(false)
      expect(store.has(kept!)).toBe(true)
      expect(Object.keys(readTTSPinIndex(PREFIX))).toEqual(['0xnew:zh-HK:v'])
    })

    it('protects an in-flight download that has no index entry yet', async () => {
      const [indexed] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const inFlight = buildSegmentURLs({ nftClassId: '0xB', count: 2 })
      const store = installFakeCaches([indexed!, ...inFlight])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      // keepPinId is the in-flight pin, which recordTTSPin has not registered yet.
      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT, keepPinId: '0xb:zh-HK:v',
      })

      expect(inFlight.every(url => store.has(url))).toBe(true)
      expect(store.has(indexed!)).toBe(false)
    })

    it('protects a download in flight from a sweep started for another book', async () => {
      const [indexed] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const inFlight = buildSegmentURLs({ nftClassId: '0xB', count: 2 })
      const store = installFakeCaches([indexed!, ...inFlight])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })
      const release = markTTSPinInFlight('0xb:zh-HK:v')

      // keepPinId is a third book entirely — only the in-flight registry saves B.
      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT, keepPinId: '0xc:zh-HK:v',
      })
      release()

      expect(inFlight.every(url => store.has(url))).toBe(true)
      expect(store.has(indexed!)).toBe(false)
    })

    it('counts segments cached under a pin beyond its recorded download size', async () => {
      // Recorded as one segment, but ten are live — a resumed download records
      // only its last run. Budgeting on the record alone would see 1/10th.
      const urls = buildSegmentURLs({ nftClassId: '0xA', count: 10 })
      const store = installFakeCaches(urls)
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 4 })

      expect(store.size).toBe(0)
      expect(readTTSPinIndex(PREFIX)).toEqual({})
    })

    it('stops evicting once the freed bytes bring it under budget', async () => {
      // The oldest pin holds ten live segments though it recorded one. Freeing it
      // is enough; crediting only the recorded size would evict the newer pin too.
      const old = buildSegmentURLs({ nftClassId: '0xOLD', count: 10 })
      const [mid] = buildSegmentURLs({ nftClassId: '0xMID', count: 1 })
      const [kept] = buildSegmentURLs({ nftClassId: '0xNEW', count: 1 })
      const store = installFakeCaches([...old, mid!, kept!])
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        '0xold:zh-HK:v': { size: SEGMENT, lastOpened: 1 },
        '0xmid:zh-HK:v': { size: SEGMENT, lastOpened: 2 },
        '0xnew:zh-HK:v': { size: SEGMENT, lastOpened: 3 },
      }))

      await pruneTTSAudioCache({
        cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 3, keepPinId: '0xnew:zh-HK:v',
      })

      expect(old.some(url => store.has(url))).toBe(false)
      expect(store.has(mid!)).toBe(true)
      expect(store.has(kept!)).toBe(true)
      expect(Object.keys(readTTSPinIndex(PREFIX)).sort()).toEqual(['0xmid:zh-HK:v', '0xnew:zh-HK:v'])
    })

    it('keeps the current download even when it alone exceeds the budget', async () => {
      const [only] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const store = installFakeCaches([only!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: 1, keepPinId: '0xa:zh-HK:v' })

      expect(store.has(only!)).toBe(true)
    })

    it('reconciles away a pin the browser purged behind our back', async () => {
      installFakeCaches([])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'gone:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 10 })

      expect(readTTSPinIndex(PREFIX)).toEqual({})
    })

    it('drops the unavailable count of a pin the sweep reconciles away', async () => {
      installFakeCaches([])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: 'gone:zh-HK:v', size: SEGMENT, unavailable: 2 })
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        'gone:zh-HK:v': { size: SEGMENT, lastOpened: 1 },
      }))

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 10 })

      expect(readTTSPinUnavailableCount(PREFIX, 'gone:zh-HK:v')).toBe(0)
    })

    it('keeps a pin recorded after its cache snapshot, for the next sweep to judge', async () => {
      installFakeCaches([])
      // As if another tab finished a download while this sweep walked the cache.
      window.localStorage.setItem(getTTSPinIndexKey(PREFIX), JSON.stringify({
        'new:zh-HK:v': { size: SEGMENT, lastOpened: Date.now() + 60 * 1000 },
      }))

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 10 })

      expect(readTTSPinIndex(PREFIX)['new:zh-HK:v']).toBeDefined()
    })

    it('leaves everything alone while under budget', async () => {
      const [pinned] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const [loose] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([pinned!, loose!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 100 })

      expect(store.size).toBe(2)
    })

    it('drops segments cached under an older TTS_AUDIO_VERSION', async () => {
      const [current] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const stale = `${buildSegmentURLs({ nftClassId: '0xA', count: 2 })[1]}&av=old`
      const store = installFakeCaches([current!, stale])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT * 2 })

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 100 })

      expect(store.has(stale)).toBe(false)
      expect(store.has(current!)).toBe(true)
    })

    it('never touches the lookahead cache, which Workbox expires itself', async () => {
      const [loose] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([], undefined, [loose!])

      await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: 1 })

      expect(store.lookahead.has(loose!)).toBe(true)
    })

    it('reports the pins still holding audio', async () => {
      const [pinned] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      installFakeCaches([pinned!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })

      const live = await pruneTTSAudioCache({ cacheKeyPrefix: PREFIX, maxBytes: SEGMENT * 100 })

      expect([...live!]).toEqual(['0xa:zh-HK:v'])
    })

    it('reports a cache failure as unknown, not as no downloads', async () => {
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })
      installFailingCaches()

      await expect(pruneTTSAudioCache({ cacheKeyPrefix: PREFIX })).resolves.toBeUndefined()
      expect(Object.keys(readTTSPinIndex(PREFIX))).toEqual(['0xa:zh-HK:v'])
    })
  })

  describe('getLiveTTSPinIds', () => {
    it('throws on a cache failure rather than reporting no downloads', async () => {
      installFailingCaches()

      await expect(getLiveTTSPinIds()).rejects.toThrow('quota')
    })
  })

  describe('removeTTSPins', () => {
    it('drops every segment of one download and its index entry', async () => {
      const target = buildSegmentURLs({ nftClassId: '0xA', count: 2 })
      const [other] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([...target, other!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT * 2 })

      const live = await removeTTSPins({ cacheKeyPrefix: PREFIX, pinIds: ['0xa:zh-HK:v'] })

      expect(target.some(url => store.has(url))).toBe(false)
      expect(store.has(other!)).toBe(true)
      expect(readTTSPinIndex(PREFIX)).toEqual({})
      expect([...live]).toEqual(['0xb:zh-HK:v'])
    })

    it('drops the unavailable count with the pin, so a new download starts clean', async () => {
      const [url] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const [other] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      installFakeCaches([url!, other!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT, unavailable: 3 })
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xb:zh-HK:v', size: SEGMENT, unavailable: 1 })

      await removeTTSPins({ cacheKeyPrefix: PREFIX, pinIds: ['0xa:zh-HK:v'] })

      expect(readTTSPinUnavailableCount(PREFIX, '0xa:zh-HK:v')).toBe(0)
      expect(readTTSPinUnavailableCount(PREFIX, '0xb:zh-HK:v')).toBe(1)
    })

    it('drops the same book and voice from the lookahead cache too', async () => {
      const [downloaded] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const heard = buildSegmentURLs({ nftClassId: '0xA', count: 2 })[1]!
      const [otherHeard] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([downloaded!], undefined, [heard, otherHeard!])

      const live = await removeTTSPins({ cacheKeyPrefix: PREFIX, pinIds: ['0xa:zh-HK:v'] })

      expect(store.size).toBe(0)
      expect([...store.lookahead]).toEqual([otherHeard])
      // Lookahead is not a download, so it never reads as a live pin.
      expect(live.size).toBe(0)
    })

    it('throws on a cache failure and keeps the index entry', async () => {
      const [url] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const store = installFakeCaches([url!])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })
      installFailingCaches()

      await expect(removeTTSPins({ cacheKeyPrefix: PREFIX, pinIds: ['0xa:zh-HK:v'] }))
        .rejects.toThrow('quota')
      expect(store.has(url!)).toBe(true)
      expect(Object.keys(readTTSPinIndex(PREFIX))).toEqual(['0xa:zh-HK:v'])
    })
  })

  describe('revokeTTSDownloads', () => {
    it('aborts matching in-flight downloads when their book is removed', async () => {
      installFakeCaches([])
      const target = new AbortController()
      const other = new AbortController()
      const releaseTarget = markTTSPinInFlight('0xa:zh-HK:v', target)
      const releaseOther = markTTSPinInFlight('0xb:zh-HK:v', other)

      await removeTTSPinsForBook({ cacheKeyPrefix: PREFIX, nftClassId: '0xA' })
      releaseTarget()
      releaseOther()

      expect(target.signal.reason).toBe(TTS_DOWNLOAD_REVOKED)
      expect(other.signal.aborted).toBe(false)
    })

    it('matches exact pin ids, not ones sharing a prefix', async () => {
      const controller = new AbortController()
      const release = markTTSPinInFlight('0xa:zh-HK:v2', controller)

      revokeTTSDownloads({ pinIds: ['0xa:zh-HK:v'] })
      release()

      expect(controller.signal.aborted).toBe(false)
    })
  })

  describe('removeTTSPinsForBook', () => {
    it('drops every voice of one book from both caches, and its index entries', async () => {
      const [voiceA] = buildSegmentURLs({ nftClassId: '0xA', count: 1 })
      const heardVoiceB = buildSegmentURL({ nftClassId: '0xA', language: 'zh-HK', voiceId: 'w', text: '0' })
      const [other] = buildSegmentURLs({ nftClassId: '0xB', count: 1 })
      const store = installFakeCaches([voiceA!, other!], undefined, [heardVoiceB])
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:v', size: SEGMENT })
      // Indexed but purged by the browser: must still leave the index.
      recordTTSPin({ cacheKeyPrefix: PREFIX, pinId: '0xa:zh-HK:gone', size: SEGMENT })

      const live = await removeTTSPinsForBook({ cacheKeyPrefix: PREFIX, nftClassId: '0xA' })

      expect([...store]).toEqual([other])
      expect(store.lookahead.size).toBe(0)
      expect(readTTSPinIndex(PREFIX)).toEqual({})
      expect([...live]).toEqual(['0xb:zh-HK:v'])
    })
  })

  // nuxt.config.ts's serialised plugins can only name these as literals.
  it('names the caches Workbox actually writes to', () => {
    expect(TTS_AUDIO_CACHE).toBe('tts-audio')
    expect(TTS_AUDIO_DOWNLOAD_CACHE).toBe('tts-audio-downloads')
  })

  describe('getTTSCacheKeyURL', () => {
    // Workbox's cacheKeyWillBeUsed strips `blocking`, and the native shell sets
    // it on every request — matching the URL as issued would miss everything.
    it('drops the blocking param that the cache key never carries', () => {
      expect(getTTSCacheKeyURL('https://3ook.com/api/reader/tts?text=a&blocking=1&voice_id=v'))
        .toBe('https://3ook.com/api/reader/tts?text=a&voice_id=v')
    })

    it('leaves a URL without the param unchanged', () => {
      expect(getTTSCacheKeyURL('https://3ook.com/api/reader/tts?text=a&voice_id=v'))
        .toBe('https://3ook.com/api/reader/tts?text=a&voice_id=v')
    })
  })

  describe('readTTSSegmentAudio', () => {
    function buildTaggedSegment(frameByte: number) {
      const frames = new Uint8Array([0xFF, 0xFB, frameByte])
      const tag = buildID3v2Tag({ title: 'segment' })
      const tagged = new Uint8Array(tag.length + frames.length)
      tagged.set(tag)
      tagged.set(frames, tag.length)
      return { tagged, frames }
    }

    it('returns frames in the order asked for, with each segment tag stripped', async () => {
      const first = buildTaggedSegment(0x01)
      const second = buildTaggedSegment(0x02)
      const urls = ['https://3ook.com/a', 'https://3ook.com/b']
      installFakeCaches(urls, new Map([
        [urls[0]!, first.tagged],
        [urls[1]!, second.tagged],
      ]))

      // Asked for in reverse: order must follow the argument, not the cache.
      const frames = await readTTSSegmentAudio([urls[1]!, urls[0]!])
      expect([...frames[0]!]).toEqual([...second.frames])
      expect([...frames[1]!]).toEqual([...first.frames])
    })

    // A partial download is still worth exporting, so a miss is a hole in the
    // result rather than a thrown error.
    it('reports a miss as undefined without dropping the slot', async () => {
      const { tagged, frames } = buildTaggedSegment(0x01)
      installFakeCaches(['https://3ook.com/a'], new Map([['https://3ook.com/a', tagged]]))

      const result = await readTTSSegmentAudio(['https://3ook.com/a', 'https://3ook.com/missing'])
      expect(result).toHaveLength(2)
      expect([...result[0]!]).toEqual([...frames])
      expect(result[1]).toBeUndefined()
    })

    // Reads go out in batches, so ordering has to hold ACROSS batch boundaries,
    // not just within one Promise.all.
    it('preserves order across more segments than fit in one batch', async () => {
      const urls = Array.from({ length: 70 }, (_, index) => `https://3ook.com/${index}`)
      const bodyByURL = new Map(urls.map((url, index) => {
        const frames = new Uint8Array([0xFF, 0xFB, index])
        const tag = buildID3v2Tag({ title: 'segment' })
        const tagged = new Uint8Array(tag.length + frames.length)
        tagged.set(tag)
        tagged.set(frames, tag.length)
        return [url, tagged]
      }))
      installFakeCaches(urls, bodyByURL)

      const frames = await readTTSSegmentAudio(urls)
      expect(frames).toHaveLength(70)
      expect(frames.map(frame => frame![2])).toEqual(urls.map((_, index) => index))
    })

    it('falls back to audio only ever heard, not downloaded', async () => {
      const { tagged, frames } = buildTaggedSegment(0x01)
      installFakeCaches([], new Map([['https://3ook.com/a', tagged]]), ['https://3ook.com/a'])

      const result = await readTTSSegmentAudio(['https://3ook.com/a'])
      expect([...result[0]!]).toEqual([...frames])
    })

    it('matches a blocking URL against the stripped key the cache holds', async () => {
      const { tagged, frames } = buildTaggedSegment(0x01)
      const key = 'https://3ook.com/api/reader/tts?text=a'
      installFakeCaches([key], new Map([[key, tagged]]))

      const result = await readTTSSegmentAudio(['https://3ook.com/api/reader/tts?text=a&blocking=1'])
      expect([...result[0]!]).toEqual([...frames])
    })
  })

  describe('getCachedTTSSegmentURLs', () => {
    it('returns the stored subset as the caller\'s own URLs', async () => {
      const urls = buildSegmentURLs({ nftClassId: '0xa', count: 3 })
      installFakeCaches([urls[0]!, urls[2]!])

      const cached = await getCachedTTSSegmentURLs(urls)
      expect([...cached]).toEqual([urls[0], urls[2]])
    })

    // The download asks with `blocking=1`; the cache never stores it.
    it('matches a blocking URL against the key stored without it', async () => {
      const url = buildSegmentURL({ nftClassId: '0xa', language: 'zh-HK', voiceId: 'v', text: '0' })
      installFakeCaches([url])

      const cached = await getCachedTTSSegmentURLs([`${url}&blocking=1`])
      expect(cached.has(`${url}&blocking=1`)).toBe(true)
    })

    it('ignores lookahead, which is not a download', async () => {
      const urls = buildSegmentURLs({ nftClassId: '0xa', count: 1 })
      installFakeCaches([], undefined, urls)

      expect((await getCachedTTSSegmentURLs(urls)).size).toBe(0)
    })

    it('reports nothing cached when the cache is empty', async () => {
      const urls = buildSegmentURLs({ nftClassId: '0xa', count: 2 })
      installFakeCaches([])

      expect((await getCachedTTSSegmentURLs(urls)).size).toBe(0)
    })
  })
})
