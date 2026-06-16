import { randomUUID } from 'node:crypto'
import { API_MAX_RETRIES } from '~~/shared/utils/fetch-retry'

interface PlusReadingUsageInput {
  isPaidPlus: boolean
  isBorrowed: boolean
  readerWallet: string
  classId: string
  readingTimeMs: number
  ttsTimeMs: number
}

/**
 * Forwards paced reading/TTS usage to the likecoin-api reading-usage ledger.
 * The shared service secret (not the user JWT) is what proves the usage passed through
 * this backend's wall-clock pacing — the anti-fraud boundary the payout pipeline trusts.
 * Splits each delta into the rev-share-eligible slice (paid Plus + borrowed) that funds
 * the payout pool and the non-library remainder (owned/non-Plus reads) that the API
 * records for publisher engagement stats only. Best-effort: errors are logged, never
 * thrown, so it never blocks reading-session bookkeeping; still awaited so it settles
 * before the serverless handler returns.
 *
 * Each call carries a unique `id` so the API can dedup retries: the ledger increments are
 * non-idempotent, but ofetch resends the same body (same id) on a transient `<no response>`,
 * and the API skips an already-seen id. That's what makes enabling retry here safe — it must
 * stay paired with the API-side dedup (deploy the API before this).
 */
export async function forwardPlusReadingUsage(input: PlusReadingUsageInput): Promise<void> {
  const { readerWallet, classId } = input
  // Rev-share funds only borrowed (Plus-library) reads by paid (non-trial) Plus; the
  // rest is non-library engagement, reported to publishers but never funding the pool.
  const revShareEligible = input.isPaidPlus && input.isBorrowed
  const readingTimeMs = revShareEligible ? input.readingTimeMs : 0
  const ttsTimeMs = revShareEligible ? input.ttsTimeMs : 0
  const nonLibraryReadingTimeMs = input.readingTimeMs - readingTimeMs
  const nonLibraryTtsTimeMs = input.ttsTimeMs - ttsTimeMs
  if (readingTimeMs <= 0 && ttsTimeMs <= 0
    && nonLibraryReadingTimeMs <= 0 && nonLibraryTtsTimeMs <= 0) return

  const config = useRuntimeConfig()
  const token = config.plusReadingServiceToken
  if (!token) return // unset (e.g. local dev) — skip silently

  try {
    await getLikeCoinAPIFetch()('/plus/reading/usage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        // Generated once per call; reused across retries so duplicates dedup server-side.
        id: randomUUID(),
        readerWallet,
        classId,
        readingTimeMs,
        ttsTimeMs,
        nonLibraryReadingTimeMs,
        nonLibraryTtsTimeMs,
      },
      // Opt this POST into retry (the wrapper leaves payload methods at 0 by default);
      // safe now that the API dedups on `id`. Must equal API_MAX_RETRIES — the backoff
      // curve assumes a retry budget starting there.
      retry: API_MAX_RETRIES,
      timeout: 2000, // bound heartbeat/session latency on a hung upstream; failures are swallowed below
    })
  }
  catch (error) {
    console.warn('[PlusRevShare] Failed to forward reading usage:', error)
  }
}
