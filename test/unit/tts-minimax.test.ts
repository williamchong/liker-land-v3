import { describe, expect, it } from 'vitest'
import { injectTTSPauseMarkers } from '~~/server/utils/tts-minimax'

const MARKER = '<#0.01#>'

describe('injectTTSPauseMarkers', () => {
  it('inserts a pause marker after fullwidth/CJK clause punctuation', () => {
    expect(injectTTSPauseMarkers('好，壞')).toBe(`好，${MARKER}壞`)
    expect(injectTTSPauseMarkers('好。壞')).toBe(`好。${MARKER}壞`)
    expect(injectTTSPauseMarkers('甲、乙')).toBe(`甲、${MARKER}乙`)
    expect(injectTTSPauseMarkers('好；壞')).toBe(`好；${MARKER}壞`)
    expect(injectTTSPauseMarkers('好：壞')).toBe(`好：${MARKER}壞`)
  })

  it('does not insert markers for ASCII , ; : (Latin tokens stay intact)', () => {
    expect(injectTTSPauseMarkers('12:30')).toBe('12:30')
    expect(injectTTSPauseMarkers('e.g., word')).toBe('e.g., word')
    expect(injectTTSPauseMarkers('a, b; c')).toBe('a, b; c')
  })

  it('collapses punctuation runs into a single marker', () => {
    expect(injectTTSPauseMarkers('好。。壞')).toBe(`好。。${MARKER}壞`)
    expect(injectTTSPauseMarkers('好，。壞')).toBe(`好，。${MARKER}壞`)
  })

  it('does not emit a marker when no speakable char follows', () => {
    expect(injectTTSPauseMarkers('好。')).toBe('好。')
    expect(injectTTSPauseMarkers('好，」')).toBe('好，」')
  })

  it('skips intervening whitespace when checking for a speakable char', () => {
    expect(injectTTSPauseMarkers('好。 壞')).toBe(`好。${MARKER} 壞`)
  })
})
