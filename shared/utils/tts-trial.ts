import { toUTCDateString } from '~~/shared/utils/date'

export const TTS_TRIAL_DAILY_CHARACTER_LIMIT = 1000

// Day key for the daily trial quota. UTC calendar day (same convention as the
// reading streak), so the quota resets at 00:00 UTC — 08:00 in Hong Kong.
export function getTTSTrialDate(date: Date = new Date()): string {
  return toUTCDateString(date)
}

export interface TTSTrialDailyUsage {
  ttsTrialUsageDate?: string
  ttsTrialDailyCharactersUsed?: number
}

// Characters counted against today's quota; usage recorded on a previous day
// has rolled over and counts as zero.
export function getTTSTrialDailyCharactersUsed(
  usage: TTSTrialDailyUsage | undefined,
  today: string = getTTSTrialDate(),
): number {
  if (!usage || usage.ttsTrialUsageDate !== today) return 0
  // Clamped because this also gates TTS server-side: a negative or non-finite
  // stored counter must never read as spare quota.
  const used = Number(usage.ttsTrialDailyCharactersUsed)
  return Number.isFinite(used) && used > 0 ? used : 0
}

// Minimax pacing, measured from production audio.
// Mandarin/Cantonese ~3.5-4 chars/sec ≈ 240 chars/min.
// English ~150 wpm × ~5 chars/word ≈ 750 chars/min.
const CHARS_PER_MINUTE_ZH = 240
const CHARS_PER_MINUTE_EN = 750

export function getTTSCharsPerMinute(language: string | undefined | null): number {
  if (language && language.toLowerCase().startsWith('en')) return CHARS_PER_MINUTE_EN
  return CHARS_PER_MINUTE_ZH
}

export function estimateTTSMinutes(characters: number, language: string | undefined | null): number {
  return characters / getTTSCharsPerMinute(language)
}
