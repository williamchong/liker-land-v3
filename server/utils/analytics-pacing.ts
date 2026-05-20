import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { WALL_CLOCK_JITTER_MS } from '~~/shared/constants/analytics'

export interface PacedDeltas {
  activeReadingTimeMsDelta: number
  ttsActiveTimeMsDelta: number
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

// First heartbeat of a new UTC day is unpaced — no prior reference to clamp
// against, so the request schema cap is the only bound.
export async function applyWallClockPacing(
  userWallet: string,
  nftClassId: string,
  requested: PacedDeltas,
): Promise<PacedDeltas> {
  const pacingRef = getUserCollection()
    .doc(userWallet)
    .collection('pacing')
    .doc(nftClassId.toLowerCase())

  return getFirestoreDb().runTransaction(async (transaction) => {
    const doc = await transaction.get(pacingRef)
    const data = doc.data()
    const now = Date.now()
    const today = todayUTC()

    const isNewDay = !data || data.todayDate !== today
    const lastHeartbeatMs = !isNewDay && data?.lastHeartbeatAt instanceof Timestamp
      ? data.lastHeartbeatAt.toMillis()
      : null

    let activeDelta = Math.max(0, requested.activeReadingTimeMsDelta)
    let ttsDelta = Math.max(0, requested.ttsActiveTimeMsDelta)

    if (lastHeartbeatMs !== null) {
      const wallElapsed = Math.max(0, now - lastHeartbeatMs)
      const cap = wallElapsed + WALL_CLOCK_JITTER_MS
      activeDelta = Math.min(activeDelta, cap)
      ttsDelta = Math.min(ttsDelta, cap)
    }

    transaction.set(pacingRef, {
      todayDate: today,
      lastHeartbeatAt: FieldValue.serverTimestamp(),
      accumulatedActiveTodayMs: isNewDay
        ? activeDelta
        : FieldValue.increment(activeDelta),
      accumulatedTTSTodayMs: isNewDay
        ? ttsDelta
        : FieldValue.increment(ttsDelta),
    }, { merge: true })

    return {
      activeReadingTimeMsDelta: activeDelta,
      ttsActiveTimeMsDelta: ttsDelta,
    }
  })
}
