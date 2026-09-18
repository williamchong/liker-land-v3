// A cold segment blocks on full synthesis server-side, so a download needs a
// far longer ceiling than the player's lookahead does.
const DOWNLOAD_TIMEOUT_MS = 60 * 1000

// How long to wait before re-checking whether playback still needs the network.
const BACKPRESSURE_POLL_MS = 500

// Retryable failures in a row before the pass gives up. An outage would
// otherwise spend a whole book's worth of requests — up to a minute each — on
// segments that cannot land, so the run stops early and stays resumable.
const MAX_CONSECUTIVE_FAILURES = 5

/**
 * Ask the browser to exempt this origin from eviction under storage pressure,
 * which would take downloads with it. Only when not already granted: Firefox
 * prompts for it, and the prompt must not return on every download.
 */
async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist || await navigator.storage.persisted?.()) return
    await navigator.storage.persist()
  }
  catch (error) {
    console.warn(error)
  }
}

export interface TTSDownloadProgress {
  completed: number
  total: number
  bytes: number
}

/**
 * Which books can be listened to without a network, and the loop that puts them
 * there. Mirrors useOfflineBooks: the badge is derived from the live cache
 * rather than the index, so an entry the browser evicted stops promising
 * playback we can no longer deliver.
 */
export function useOfflineTTS() {
  const config = useRuntimeConfig()
  const cacheKeyPrefix = config.public.cacheKeyPrefix

  // shallowRef: the Set is replaced wholesale, never mutated, so deep
  // reactivity would track a key per download and discard it on each refresh.
  const offlinePinIds = shallowRef<Set<string>>(new Set())
  const isDownloading = ref(false)
  const downloadProgress = ref<TTSDownloadProgress | null>(null)

  /**
   * Only pins the user downloaded, and only while their audio survives. Takes an
   * already-walked live set when the caller has one, so a sweep followed by a
   * refresh doesn't enumerate the whole cache twice. A failed sweep passes
   * undefined, and a failed walk here keeps the previous state.
   */
  async function refreshOfflineTTS(live?: Set<string>) {
    if (!import.meta.client || !window.caches) return
    try {
      const livePinIds = live ?? await getLiveTTSPinIds()
      const index = readTTSPinIndex(cacheKeyPrefix)
      offlinePinIds.value = new Set(Object.keys(index).filter(pinId => livePinIds.has(pinId)))
    }
    catch (error) {
      console.error(error)
    }
  }

  /**
   * Fetch each segment so the service worker caches it, then register the result
   * as a pin. One at a time and `blocking`, exactly as the player's lookahead
   * does: parallel fetches would queue behind themselves, and an abandoned
   * stream makes the server drop its half-written cache object.
   *
   * `shouldPause` is the caller's backpressure — a download that ignored
   * playback would compete with the segments the playhead is waiting on.
   */
  async function downloadTTS({
    pinId,
    segments,
    getAudioSrc,
    signal,
    shouldPause,
  }: {
    pinId: string
    segments: TTSSegment[]
    getAudioSrc: (segment: TTSSegment, options?: { blocking?: boolean }) => string
    signal?: AbortSignal
    shouldPause?: () => boolean
  }): Promise<TTSDownloadProgress & { failed: number, unavailable: number, isRevoked: boolean }> {
    if (!import.meta.client || !window.caches) {
      throw new Error('TTS download requires a browser cache')
    }
    // The worker is what stores each segment: without one controlling the page
    // (a first load, a hard reload) every fetch succeeds and nothing is kept.
    if (!navigator.serviceWorker?.controller) {
      throw new Error('TTS download requires an active service worker')
    }
    // One at a time: two loops would interleave progress and race the pin record.
    // Checked against the module-scope registry, not this instance's ref, since
    // every useOfflineTTS() call has its own.
    if (isDownloading.value || getIsTTSPinInFlight(pinId)) {
      throw new Error('A TTS download is already running')
    }

    // Built once: every URL re-sanitizes and re-signs its segment text.
    // Distinct, as the coverage count is: a repeated heading is one entry.
    const urls = [...new Set(segments.map(segment => getAudioSrc(segment, { blocking: true })))]
    const total = urls.length

    // Revokes get a controller of their own: an abort keeps only its first
    // reason, so one sharing the caller's would miss a revoke after a cancel.
    const revokeController = new AbortController()
    // Locked before the first await: a second start in the gap would pass the
    // check above, and its release would then unmark this run mid-fetch.
    const releasePin = markTTSPinInFlight(pinId, revokeController)
    const controller = new AbortController()
    const stopForwarding = [signal, revokeController.signal].map(source => forwardAbort(source, controller))
    isDownloading.value = true
    void requestPersistentStorage()
    let completed = 0
    let failed = 0
    let unavailable = 0
    let consecutiveFailures = 0
    let bytes = 0
    downloadProgress.value = { completed, total, bytes }

    try {
      // Segments a cancelled run already downloaded are counted rather than
      // refetched, so resuming costs one cache walk instead of a second pass.
      // Ones only heard are fetched, but the worker copies them off disk.
      const cachedURLs = await getCachedTTSSegmentURLs(urls)

      for (const url of urls) {
        if (controller.signal.aborted) break
        while (shouldPause?.() && !controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, BACKPRESSURE_POLL_MS))
        }
        if (controller.signal.aborted) break

        if (cachedURLs.has(url)) {
          completed++
          downloadProgress.value = { completed, total, bytes }
          continue
        }

        try {
          // The fetch runs inside the wrapper, not around it: the drain is part
          // of what must hit the timeout, and a cancel mid-drain must abort the
          // request rather than wait it out.
          const byteLength = await withAbortTimeout(
            DOWNLOAD_TIMEOUT_MS,
            fetchSignal => fetchTTSSegmentIntoCache(url, fetchSignal, { isDownload: true }),
            controller.signal,
          )
          // Undefined is a rejection of this segment's text, so it is not a
          // streak: a book with a few unsynthesisable segments still downloads
          // the rest. A thrown error is either worth retrying or ends the run.
          if (byteLength === undefined) {
            failed++
            unavailable++
            // A 400 for the voice itself rejects them all, so a run that has
            // landed nothing stops rather than fetch the rest to be told again.
            if (!bytes && unavailable >= MAX_CONSECUTIVE_FAILURES) break
            continue
          }
          bytes += byteLength
          completed++
          consecutiveFailures = 0
        }
        catch (error) {
          // A cancel or a revoke rejects the in-flight fetch; that is not a failure.
          if (controller.signal.aborted) break
          failed++
          // A lapsed session or entitlement rejects every segment left, so stop
          // now; counted as failed, not unavailable, so resume stays on offer.
          if (!getIsRetryableHTTPError(error)) break
          consecutiveFailures++
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) break
        }
        downloadProgress.value = { completed, total, bytes }
      }

      // Register whatever landed: a partial download still plays offline up to
      // where it reached, and the pin is what protects it from the sweep. Recorded
      // before releasing the in-flight mark, so no sweep can see it unprotected.
      // Never after a revoke: the pin was removed on purpose.
      const isRevoked = revokeController.signal.aborted
      if (completed && !isRevoked) {
        recordTTSPin({
          cacheKeyPrefix,
          pinId,
          size: bytes,
          // Permanent rejections only. A timeout or a 5xx must leave the state
          // at "partial" so the resume action stays on offer.
          unavailable: signal?.aborted ? undefined : unavailable,
        })
        const live = await pruneTTSAudioCache({ cacheKeyPrefix, keepPinId: pinId })
        await refreshOfflineTTS(live)
      }
      return { completed, total, bytes, failed, unavailable, isRevoked }
    }
    finally {
      stopForwarding.forEach(stop => stop())
      releasePin()
      isDownloading.value = false
      downloadProgress.value = null
    }
  }

  async function removeOfflineTTS(pinIds: string[]) {
    try {
      await refreshOfflineTTS(await removeTTSPins({ cacheKeyPrefix, pinIds }))
    }
    catch (error) {
      // Some segments may be gone and others not: re-read what survived.
      await refreshOfflineTTS()
      throw error
    }
  }

  /** Bump the pin's recency on a listen, and reconcile what the browser purged. */
  async function sweepTTSAudioCache(keepPinId?: string) {
    if (keepPinId) touchTTSPin({ cacheKeyPrefix, pinId: keepPinId })
    const live = await pruneTTSAudioCache({ cacheKeyPrefix, keepPinId })
    await refreshOfflineTTS(live)
  }

  return {
    offlinePinIds,
    isDownloading,
    downloadProgress,
    refreshOfflineTTS,
    downloadTTS,
    removeOfflineTTS,
    sweepTTSAudioCache,
  }
}
