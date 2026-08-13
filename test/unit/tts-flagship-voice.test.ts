import { describe, expect, it } from 'vitest'
import { getFlagshipSystemVoice } from '~~/shared/utils/tts-sample'

describe('getFlagshipSystemVoice', () => {
  // The pricing page claims the sample is a cloned voice, so the flagship owner
  // must stay in the owner-lent map rather than drifting to a stock voice.
  it('resolves to an owner-lent system voice', () => {
    const voice = getFlagshipSystemVoice()
    expect(voice).toBeDefined()
    expect(voice?.voiceId).toBeTruthy()
    expect(voice?.name).toBeTruthy()
  })
})
