declare interface TTSAudioPlayerEvents {
  play: () => void
  pause: () => void
  ended: () => void
  trackChanged: (index: number) => void
  allEnded: () => void
  error: (error: string | Event | MediaError) => void
}

declare interface TTSAudioPlayer {
  load(options: {
    segments: TTSSegment[]
    getAudioSrc: (segment: TTSSegment) => string
    startIndex: number
    rate: number
    metadata: { bookTitle: string, authorName: string, coverUrl: string }
  }): void
  resume(): boolean
  pause(): void
  stop(): void
  skipTo(index: number): void
  setRate(rate: number): void
  on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]): void
}
