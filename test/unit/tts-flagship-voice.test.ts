import { describe, expect, it } from 'vitest'
import { getFlagshipSystemVoice } from '~~/shared/utils/tts-sample'

describe('getFlagshipSystemVoice', () => {
  // The pricing page claims the sample is a cloned voice, so every country must
  // resolve to the owner-lent map rather than drifting to a stock voice. US has
  // no owner-lent English clone and so falls back to Cantonese.
  it.each([
    [undefined, 'zh-HK'],
    [null, 'zh-HK'],
    ['HK', 'zh-HK'],
    ['US', 'zh-HK'],
    ['TW', 'zh-TW'],
  ])('resolves %s to an owner-lent %s voice', (country, language) => {
    const voice = getFlagshipSystemVoice(country)
    expect(voice?.voiceId).toBeTruthy()
    expect(voice?.name).toBeTruthy()
    expect(voice?.language).toBe(language)
  })
})
