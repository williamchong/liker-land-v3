import { describe, expect, it } from 'vitest'
import {
  estimateTTSMinutes,
  getTTSCharsPerMinute,
  getTTSTrialDailyCharactersUsed,
  getTTSTrialDate,
  TTS_TRIAL_DAILY_CHARACTER_LIMIT,
} from '~~/shared/utils/tts-trial'

describe('getTTSTrialDate', () => {
  it('returns the UTC calendar date as YYYY-MM-DD', () => {
    expect(getTTSTrialDate(new Date('2026-07-10T12:34:56Z'))).toBe('2026-07-10')
  })

  it('rolls over at UTC midnight, not local midnight', () => {
    expect(getTTSTrialDate(new Date('2026-07-10T23:59:59Z'))).toBe('2026-07-10')
    expect(getTTSTrialDate(new Date('2026-07-11T00:00:00Z'))).toBe('2026-07-11')
    // 07:59 HKT is still the previous UTC day.
    expect(getTTSTrialDate(new Date('2026-07-11T07:59:00+08:00'))).toBe('2026-07-10')
  })
})

describe('getTTSTrialDailyCharactersUsed', () => {
  const today = '2026-07-10'

  it('returns 0 for a missing user doc', () => {
    expect(getTTSTrialDailyCharactersUsed(undefined, today)).toBe(0)
  })

  it('returns 0 when no daily usage has ever been recorded', () => {
    expect(getTTSTrialDailyCharactersUsed({}, today)).toBe(0)
  })

  it('returns the counter when usage was recorded today', () => {
    expect(getTTSTrialDailyCharactersUsed({
      ttsTrialUsageDate: today,
      ttsTrialDailyCharactersUsed: 900,
    }, today)).toBe(900)
  })

  it('resets to 0 when usage was recorded on a previous day', () => {
    expect(getTTSTrialDailyCharactersUsed({
      ttsTrialUsageDate: '2026-07-09',
      ttsTrialDailyCharactersUsed: TTS_TRIAL_DAILY_CHARACTER_LIMIT,
    }, today)).toBe(0)
  })

  it('treats a malformed counter as 0', () => {
    expect(getTTSTrialDailyCharactersUsed({
      ttsTrialUsageDate: today,
      ttsTrialDailyCharactersUsed: Number.NaN,
    }, today)).toBe(0)
  })

  it('treats a negative counter as 0 rather than spare quota', () => {
    expect(getTTSTrialDailyCharactersUsed({
      ttsTrialUsageDate: today,
      ttsTrialDailyCharactersUsed: -500,
    }, today)).toBe(0)
  })

  it('treats a non-finite counter as 0', () => {
    expect(getTTSTrialDailyCharactersUsed({
      ttsTrialUsageDate: today,
      ttsTrialDailyCharactersUsed: Number.POSITIVE_INFINITY,
    }, today)).toBe(0)
  })
})

describe('estimateTTSMinutes', () => {
  it('uses English pacing for en voices and CJK pacing otherwise', () => {
    expect(getTTSCharsPerMinute('en-US')).toBe(750)
    expect(getTTSCharsPerMinute('zh-HK')).toBe(240)
    expect(estimateTTSMinutes(1200, 'zh-HK')).toBe(5)
    expect(estimateTTSMinutes(1500, 'en-US')).toBe(2)
  })
})
