import * as v from 'valibot'

export const ReadingSessionSchema = v.object({
  nftClassId: v.pipe(
    v.string('MISSING_NFT_CLASS_ID'),
    v.nonEmpty('MISSING_NFT_CLASS_ID'),
  ),
  sessionId: v.pipe(
    v.string('MISSING_SESSION_ID'),
    v.nonEmpty('MISSING_SESSION_ID'),
  ),
  activeReadingTimeMs: v.pipe(
    v.number('INVALID_ACTIVE_READING_TIME'),
    v.minValue(0, 'INVALID_ACTIVE_READING_TIME'),
    v.maxValue(4 * 60 * 60 * 1000, 'ACTIVE_READING_TIME_TOO_LARGE'),
  ),
  ttsActiveTimeMs: v.pipe(
    v.number('INVALID_TTS_ACTIVE_TIME'),
    v.minValue(0, 'INVALID_TTS_ACTIVE_TIME'),
    v.maxValue(4 * 60 * 60 * 1000, 'TTS_ACTIVE_TIME_TOO_LARGE'),
  ),
  pagesViewed: v.pipe(
    v.number('INVALID_PAGES_VIEWED'),
    v.minValue(0, 'INVALID_PAGES_VIEWED'),
    v.integer('INVALID_PAGES_VIEWED'),
  ),
  startProgress: v.pipe(
    v.number('INVALID_START_PROGRESS'),
    v.minValue(0, 'INVALID_START_PROGRESS'),
    v.maxValue(100, 'INVALID_START_PROGRESS'),
  ),
  endProgress: v.pipe(
    v.number('INVALID_END_PROGRESS'),
    v.minValue(0, 'INVALID_END_PROGRESS'),
    v.maxValue(100, 'INVALID_END_PROGRESS'),
  ),
  readerType: v.picklist(['epub', 'pdf'], 'INVALID_READER_TYPE'),
  chapterIndex: v.optional(v.number()),
})

export const HeartbeatSchema = v.object({
  nftClassId: v.pipe(
    v.string('MISSING_NFT_CLASS_ID'),
    v.nonEmpty('MISSING_NFT_CLASS_ID'),
  ),
  sessionId: v.pipe(
    v.string('MISSING_SESSION_ID'),
    v.nonEmpty('MISSING_SESSION_ID'),
  ),
  activeReadingTimeMsDelta: v.pipe(
    v.number('INVALID_ACTIVE_READING_TIME_DELTA'),
    v.minValue(0, 'INVALID_ACTIVE_READING_TIME_DELTA'),
    v.maxValue(4 * 60 * 60 * 1000, 'ACTIVE_READING_TIME_DELTA_TOO_LARGE'),
  ),
  ttsActiveTimeMsDelta: v.pipe(
    v.number('INVALID_TTS_ACTIVE_TIME_DELTA'),
    v.minValue(0, 'INVALID_TTS_ACTIVE_TIME_DELTA'),
    v.maxValue(4 * 60 * 60 * 1000, 'TTS_ACTIVE_TIME_DELTA_TOO_LARGE'),
  ),
})
