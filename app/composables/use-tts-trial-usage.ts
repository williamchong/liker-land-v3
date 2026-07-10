import { useNow, useStorage } from '@vueuse/core'
import { getTTSTrialDate, TTS_TRIAL_DAILY_CHARACTER_LIMIT } from '~~/shared/utils/tts-trial'

// Module-scoped so dedup survives `useTextToSpeech` teardown when the player
// modal closes (no double-count on replay after re-open). Cleared on day
// rollover so a replayed segment spends the new day's quota.
const optimisticallyCountedSegments = new Set<string>()

interface ServerUsage {
  charactersUsed: number
  limit: number
}

// Persisted per wallet: characters experienced on `date` (UTC day key).
// A stored date other than today reads as 0 — that's the daily reset.
interface StoredDailyUsage {
  date: string
  used: number
}

// Per-wallet dedup for the server floor fetch — prevents N concurrent GETs
// when multiple components mount the composable at the same time.
const inflightServerFetches = new Map<string, Promise<ServerUsage | null>>()

async function fetchServerUsage(wallet: string): Promise<ServerUsage | null> {
  const pending = inflightServerFetches.get(wallet)
  if (pending) return pending
  const task = (async (): Promise<ServerUsage | null> => {
    try {
      return await apiFetch<ServerUsage>('/reader/tts/usage')
    }
    catch (error) {
      console.warn('[TTSTrialUsage] Failed to fetch server usage:', error)
      return null
    }
    finally {
      inflightServerFetches.delete(wallet)
    }
  })()
  inflightServerFetches.set(wallet, task)
  return task
}

export function useTTSTrialUsage() {
  const { loggedIn: hasLoggedIn, user } = useUserSession()

  // Trust the device store's confirmed purchase too, so a paid user isn't
  // gated client-side while the backend webhook flips the canonical flag.
  const { isPlusOrDevicePlus: isLikerPlus } = useDevicePlusEntitlement()

  const wallet = computed(() => user.value?.evmWallet || '')

  // Ticking day key so a session straddling the UTC midnight reset
  // un-exhausts (and re-counts) without a reload.
  const now = useNow({ interval: 60_000 })
  const today = computed(() => getTTSTrialDate(now.value))

  // Reactive key: wallet switch rebinds the ref to the new wallet's storage
  // key automatically. `anon` is a sentinel for the logged-out state — the UI
  // gates on `isLoaded`, so any writes to it are never displayed.
  const storageKey = computed(() =>
    `tts-trial-daily-${wallet.value.toLowerCase() || 'anon'}`,
  )
  const storedUsage = useStorage<StoredDailyUsage>(storageKey, { date: '', used: 0 })
  const limit = useState<number>('tts-trial-limit', () => TTS_TRIAL_DAILY_CHARACTER_LIMIT)

  const charactersUsed = computed(() =>
    storedUsage.value.date === today.value ? storedUsage.value.used : 0,
  )
  const charactersRemaining = computed(() => Math.max(limit.value - charactersUsed.value, 0))
  const isExhausted = computed(() => !isLikerPlus.value && charactersUsed.value >= limit.value)
  const isLoaded = computed(() =>
    hasLoggedIn.value && (isLikerPlus.value || (import.meta.client && !!wallet.value)),
  )

  async function mergeServerUsage(targetWallet: string): Promise<void> {
    const requestDay = today.value
    const server = await fetchServerUsage(targetWallet)
    if (server === null) return
    // Guard against wallet change while the request was in flight.
    if (wallet.value !== targetWallet) return
    // The limit isn't day-scoped, so pick it up regardless of a rollover.
    if (server.limit !== limit.value) limit.value = server.limit
    // Crossing UTC midnight in flight: the count belongs to the day that just
    // ended, and stamping it on the new day would show the quota as exhausted.
    if (today.value !== requestDay) return
    if (server.charactersUsed <= charactersUsed.value) return
    storedUsage.value = { date: requestDay, used: server.charactersUsed }
  }

  watch([wallet, hasLoggedIn], ([newWallet, loggedIn], oldValues) => {
    const [oldWallet] = oldValues ?? []
    if (!import.meta.client) return
    if (!loggedIn || !newWallet) {
      optimisticallyCountedSegments.clear()
      return
    }
    // Clear per-wallet dedup on wallet switch so the new wallet isn't
    // suppressed by segments counted under the previous wallet.
    if (oldWallet && oldWallet !== newWallet) {
      optimisticallyCountedSegments.clear()
    }
    // Non-blocking merge: localStorage may be wiped while the server still
    // holds today's count. Keeps the chip from understating relative to the
    // server wall, and picks up limit changes without a client deploy.
    if (!isLikerPlus.value) {
      void mergeServerUsage(newWallet)
    }
  }, { immediate: true })

  // Counts every segment the user plays (cache hit or fresh generation),
  // so the meter tracks experienced TTS — not server-side generation cost,
  // which is blind to Cloudflare/Firebase cache hits.
  function recordOptimisticSegmentUsage(dedupKey: string, charactersDelta: number): void {
    if (!import.meta.client) return
    if (!wallet.value || isLikerPlus.value) return
    const currentDay = today.value
    if (storedUsage.value.date !== currentDay) {
      // Day rollover: drop yesterday's dedup keys so replays count again.
      optimisticallyCountedSegments.clear()
    }
    if (optimisticallyCountedSegments.has(dedupKey)) return
    optimisticallyCountedSegments.add(dedupKey)
    // `charactersUsed` already reads as 0 when the stored date isn't today.
    storedUsage.value = { date: currentDay, used: charactersUsed.value + charactersDelta }
  }

  return {
    isLoaded,
    charactersUsed,
    limit,
    charactersRemaining,
    isExhausted,
    recordOptimisticSegmentUsage,
  }
}
