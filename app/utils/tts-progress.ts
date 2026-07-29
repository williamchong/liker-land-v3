// Whole-book TTS progress is estimated from character counts: no segment past
// the current one has been synthesised, so no real durations exist.

// Cumulative characters before each segment; the last entry is the book total.
export function getTTSCharOffsets(segments: { text: string }[]): number[] {
  const offsets = new Array<number>(segments.length + 1)
  let total = 0
  for (let i = 0; i < segments.length; i++) {
    offsets[i] = total
    total += segments[i]?.text.length ?? 0
  }
  offsets[segments.length] = total
  return offsets
}

// Clock-style duration, e.g. "20:50" or "1:20:50" past an hour.
export function formatTTSClock(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const paddedSeconds = (totalSeconds % 60).toString().padStart(2, '0')
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${paddedSeconds}`
  }
  return `${minutes}:${paddedSeconds}`
}
