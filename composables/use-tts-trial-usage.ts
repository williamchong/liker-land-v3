import { TTS_TRIAL_CHARACTER_LIMIT } from '~/shared/utils/tts-trial'

// Module-scoped so dedup survives `useTextToSpeech` teardown when the player
// modal closes; otherwise replaying the same segment after re-open would
// double-count the same audio.
const optimisticallyCountedSegments = new Set<string>()

interface ServerUsage {
  charactersUsed: number
  limit: number
}

// Per-wallet dedup for the server floor fetch — prevents N concurrent GETs
// when multiple components mount the composable at the same time.
const inflightServerFetches = new Map<string, Promise<ServerUsage | null>>()

function getStorageKey(wallet: string): string {
  return `tts-trial-chars-${wallet.toLowerCase()}`
}

function readStoredCharacters(wallet: string): number {
  if (!import.meta.client || !wallet) return 0
  const raw = localStorage.getItem(getStorageKey(wallet))
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function writeStoredCharacters(wallet: string, value: number): void {
  if (!import.meta.client || !wallet) return
  try {
    localStorage.setItem(getStorageKey(wallet), String(value))
  }
  catch (error) {
    console.warn('[TTSTrialUsage] Failed to persist:', error)
  }
}

async function fetchServerUsage(wallet: string): Promise<ServerUsage | null> {
  const pending = inflightServerFetches.get(wallet)
  if (pending) return pending
  const task = (async (): Promise<ServerUsage | null> => {
    try {
      return await $fetch<ServerUsage>('/api/reader/tts/usage')
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

  const charactersUsed = useState<number>('tts-trial-chars-used', () => 0)
  const limit = useState<number>('tts-trial-limit', () => TTS_TRIAL_CHARACTER_LIMIT)
  const hasHydrated = useState<boolean>('tts-trial-hydrated', () => false)

  const wallet = computed(() => user.value?.evmWallet || '')
  const isLikerPlus = computed(() => !!user.value?.isLikerPlus)

  const charactersRemaining = computed(() => Math.max(limit.value - charactersUsed.value, 0))
  const isExhausted = computed(() => !isLikerPlus.value && charactersUsed.value >= limit.value)
  const isLoaded = computed(() => hasLoggedIn.value && (isLikerPlus.value || hasHydrated.value))

  async function mergeServerUsage(targetWallet: string): Promise<void> {
    const server = await fetchServerUsage(targetWallet)
    if (server === null) return
    // Guard against wallet change while the request was in flight.
    if (wallet.value !== targetWallet) return
    if (server.limit !== limit.value) limit.value = server.limit
    if (server.charactersUsed <= charactersUsed.value) return
    charactersUsed.value = server.charactersUsed
    writeStoredCharacters(targetWallet, server.charactersUsed)
  }

  watch([wallet, hasLoggedIn], ([newWallet, loggedIn]) => {
    if (!import.meta.client) return
    if (!loggedIn || !newWallet) {
      charactersUsed.value = 0
      hasHydrated.value = false
      optimisticallyCountedSegments.clear()
      return
    }
    charactersUsed.value = readStoredCharacters(newWallet)
    hasHydrated.value = true
    // Non-blocking merge: localStorage may be wiped (new device, private
    // mode, user cleared data) while the server still holds the cost
    // counter. Merging keeps the chip from understating relative to the
    // hard wall enforced by `getUserTTSAvailable`, and also picks up the
    // server-side limit so changes don't require a client deploy.
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
    if (optimisticallyCountedSegments.has(dedupKey)) return
    optimisticallyCountedSegments.add(dedupKey)
    const next = charactersUsed.value + charactersDelta
    charactersUsed.value = next
    writeStoredCharacters(wallet.value, next)
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
