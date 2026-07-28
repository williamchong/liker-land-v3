import { describe, expect, it } from 'vitest'
import { formatTTSClock, getTTSCharOffsets } from '~/utils/tts-progress'

function makeSegments(lengths: number[]) {
  return lengths.map(length => ({ text: 'a'.repeat(length) }))
}

describe('getTTSCharOffsets', () => {
  it('returns cumulative characters before each segment, plus the total', () => {
    expect(getTTSCharOffsets(makeSegments([10, 5, 20]))).toEqual([0, 10, 15, 35])
  })

  it('returns a zero total for an empty book', () => {
    expect(getTTSCharOffsets([])).toEqual([0])
  })

  it('weights by characters, not by segment count', () => {
    const offsets = getTTSCharOffsets(makeSegments([2, 2, 2, 94]))
    // Three of four segments done is 6% of the book, not 75%. The entry past
    // the last segment is the full total, so the player can reach 100%.
    expect(offsets[3]).toBe(6)
    expect(offsets.at(-1)).toBe(100)
  })
})

describe('formatTTSClock', () => {
  it('formats sub-hour durations as m:ss', () => {
    expect(formatTTSClock(1250)).toBe('20:50')
    expect(formatTTSClock(65)).toBe('1:05')
    expect(formatTTSClock(9)).toBe('0:09')
  })

  it('formats durations over an hour as h:mm:ss', () => {
    expect(formatTTSClock(4850)).toBe('1:20:50')
    expect(formatTTSClock(3600)).toBe('1:00:00')
  })

  it('clamps at zero so the countdown never reads negative', () => {
    expect(formatTTSClock(0)).toBe('0:00')
    expect(formatTTSClock(-30)).toBe('0:00')
  })
})
