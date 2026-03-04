import { useDocumentVisibility, useEventListener } from '@vueuse/core'

const IDLE_TIMEOUT_MS = 2 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000
const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000

interface ReadingSessionOptions {
  nftClassId: string | Ref<string>
  readerType: 'epub' | 'pdf'
  progress: Ref<number>
  isTextToSpeechPlaying?: Ref<boolean>
  chapterIndex?: Ref<number | undefined>
}

export function useReadingSession(options: ReadingSessionOptions) {
  const { readerType, progress, isTextToSpeechPlaying, chapterIndex } = options
  const nftClassId = toRef(options.nftClassId)

  const { loggedIn } = useUserSession()
  const sessionId = crypto.randomUUID()
  const startProgress = progress.value
  const pagesViewed = reactive(new Set<number | string>())

  let activeReadingTimeMs = 0
  let ttsActiveTimeMs = 0
  let lastActiveTimestamp: number | null = null
  let lastTTSTimestamp: number | null = null

  let sessionFlushed = false
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  const isIdle = ref(false)
  const visibility = useDocumentVisibility()
  const isTabVisible = computed(() => visibility.value === 'visible')

  const isActivelyReading = computed(() =>
    isTabVisible.value && !isIdle.value,
  )

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer)
    if (isIdle.value) {
      isIdle.value = false
    }
    idleTimer = setTimeout(() => {
      isIdle.value = true
    }, IDLE_TIMEOUT_MS)
  }

  watch(isActivelyReading, (active) => {
    if (active) {
      lastActiveTimestamp = Date.now()
    }
    else if (lastActiveTimestamp) {
      activeReadingTimeMs += Date.now() - lastActiveTimestamp
      lastActiveTimestamp = null
    }
  }, { immediate: true })

  if (isTextToSpeechPlaying) {
    watch(isTextToSpeechPlaying, (playing) => {
      if (playing) {
        lastTTSTimestamp = Date.now()
      }
      else if (lastTTSTimestamp) {
        ttsActiveTimeMs += Date.now() - lastTTSTimestamp
        lastTTSTimestamp = null
      }
    }, { immediate: true })
  }

  if (chapterIndex) {
    watch(chapterIndex, (index) => {
      if (index !== undefined) {
        pagesViewed.add(index)
      }
    }, { immediate: true })
  }
  watch(progress, () => {
    pagesViewed.add(Math.floor(progress.value))
  }, { immediate: true })

  function getSnapshot() {
    const now = Date.now()
    let currentActiveTime = activeReadingTimeMs
    let currentTTSTime = ttsActiveTimeMs

    if (lastActiveTimestamp) {
      currentActiveTime += now - lastActiveTimestamp
    }
    if (lastTTSTimestamp) {
      currentTTSTime += now - lastTTSTimestamp
    }

    return {
      activeReadingTimeMs: Math.min(currentActiveTime, MAX_SESSION_DURATION_MS),
      ttsActiveTimeMs: Math.min(currentTTSTime, MAX_SESSION_DURATION_MS),
      pagesViewed: pagesViewed.size,
      endProgress: progress.value,
    }
  }

  function buildSessionPayload() {
    const snapshot = getSnapshot()
    if (snapshot.activeReadingTimeMs < 1000 && snapshot.ttsActiveTimeMs < 1000) return null

    return {
      nftClassId: toValue(nftClassId),
      sessionId,
      activeReadingTimeMs: snapshot.activeReadingTimeMs,
      ttsActiveTimeMs: snapshot.ttsActiveTimeMs,
      pagesViewed: snapshot.pagesViewed,
      startProgress,
      endProgress: snapshot.endProgress,
      readerType,
      chapterIndex: chapterIndex?.value,
    }
  }

  function getDeltaSinceLastFlush() {
    const now = Date.now()
    let deltaActiveTime = activeReadingTimeMs
    let deltaTTSTime = ttsActiveTimeMs

    if (lastActiveTimestamp) {
      deltaActiveTime += now - lastActiveTimestamp
      lastActiveTimestamp = now
    }
    if (lastTTSTimestamp) {
      deltaTTSTime += now - lastTTSTimestamp
      lastTTSTimestamp = now
    }

    activeReadingTimeMs = 0
    ttsActiveTimeMs = 0

    return {
      activeReadingTimeMsDelta: Math.min(deltaActiveTime, MAX_SESSION_DURATION_MS),
      ttsActiveTimeMsDelta: Math.min(deltaTTSTime, MAX_SESSION_DURATION_MS),
    }
  }

  async function flushSession() {
    if (sessionFlushed || !loggedIn.value) return
    sessionFlushed = true

    const payload = buildSessionPayload()
    if (!payload) return

    try {
      const result = await $fetch('/api/analytics/session', {
        method: 'POST',
        body: payload,
      })
      if (result.bookCompleted) {
        useLogEvent('book_completed', {
          nft_class_id: toValue(nftClassId),
        })
      }
    }
    catch (error) {
      console.warn('[ReadingSession] Failed to flush session:', error)
    }

    useLogEvent('reading_session_end', {
      nft_class_id: toValue(nftClassId),
      active_reading_time_ms: payload.activeReadingTimeMs,
      tts_active_time_ms: payload.ttsActiveTimeMs,
      pages_viewed: payload.pagesViewed,
    })
  }

  function flushSessionBeacon() {
    if (sessionFlushed || !loggedIn.value) return
    sessionFlushed = true

    const payload = buildSessionPayload()
    if (!payload) return

    navigator.sendBeacon(
      '/api/analytics/session',
      new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    )
  }

  async function sendHeartbeat() {
    if (!loggedIn.value) return

    const delta = getDeltaSinceLastFlush()
    if (delta.activeReadingTimeMsDelta < 1000 && delta.ttsActiveTimeMsDelta < 1000) return

    try {
      await $fetch('/api/analytics/heartbeat', {
        method: 'POST',
        body: {
          nftClassId: toValue(nftClassId),
          sessionId,
          activeReadingTimeMsDelta: delta.activeReadingTimeMsDelta,
          ttsActiveTimeMsDelta: delta.ttsActiveTimeMsDelta,
        },
      })
    }
    catch (error) {
      console.warn('[ReadingSession] Failed to send heartbeat:', error)
    }
  }

  const activityEvents = ['scroll', 'touchstart', 'keydown', 'pointermove'] as const
  for (const eventName of activityEvents) {
    useEventListener(window, eventName, resetIdleTimer, { passive: true })
  }

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    resetIdleTimer()
    heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
  })

  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushSession()
    }
  })

  onBeforeUnmount(() => {
    if (idleTimer) clearTimeout(idleTimer)
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    flushSessionBeacon()
  })

  return {
    sessionId,
    pagesViewed,
  }
}
