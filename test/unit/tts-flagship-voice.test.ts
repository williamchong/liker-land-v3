import { describe, expect, it } from 'vitest'
import { getFlagshipSystemVoice, getSystemVoiceByOwnerLikerId } from '~~/shared/utils/tts-sample'

describe('getFlagshipSystemVoice', () => {
  it('resolves to a real system voice', () => {
    const voice = getFlagshipSystemVoice()
    expect(voice).toBeDefined()
    expect(voice?.voiceId).toBeTruthy()
    expect(voice?.name).toBeTruthy()
  })

  // The pricing page claims the sample is a cloned voice, so the flagship must
  // stay one of the owner-lent voices rather than drifting to a stock voice.
  it('is one of the owner-lent system voices', () => {
    const voice = getFlagshipSystemVoice()
    expect(getSystemVoiceByOwnerLikerId('withthepoons')).toEqual(voice)
  })
})
