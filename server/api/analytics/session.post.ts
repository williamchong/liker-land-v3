import { ReadingSessionSchema } from '~/server/schemas/analytics'

const COMPLETION_THRESHOLD = 95

export default defineEventHandler(async (event) => {
  const wallet = await requireUserWallet(event)
  const body = await readValidatedBody(event, createValidator(ReadingSessionSchema))

  const {
    nftClassId,
    sessionId,
    activeReadingTimeMs,
    ttsActiveTimeMs,
    pagesViewed,
    startProgress,
    endProgress,
    readerType,
    chapterIndex,
  } = body

  await Promise.all([
    (activeReadingTimeMs > 0 || ttsActiveTimeMs > 0)
      ? incrementBookReadingTime(wallet, nftClassId, activeReadingTimeMs, ttsActiveTimeMs, { countSession: true })
      : Promise.resolve(),
    updateReadingStreak(wallet),
  ])

  publishEvent(event, 'ReadingSession', {
    evmWallet: wallet,
    nftClassId,
    sessionId,
    activeReadingTimeMs,
    ttsActiveTimeMs,
    pagesViewed,
    startProgress,
    endProgress,
    readerType,
    chapterIndex,
  })

  let bookCompleted = false
  if (endProgress >= COMPLETION_THRESHOLD) {
    const isNewCompletion = await markBookCompleted(wallet, nftClassId)
    if (isNewCompletion) {
      bookCompleted = true
      publishEvent(event, 'BookCompleted', {
        evmWallet: wallet,
        nftClassId,
        completionProgress: endProgress,
      })
    }
  }

  return { success: true, bookCompleted }
})
