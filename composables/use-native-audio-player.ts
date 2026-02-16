import { useEventListener } from '@vueuse/core'

export function useNativeAudioPlayer(): TTSAudioPlayer {
  const handlers: Partial<{ [K in keyof TTSAudioPlayerEvents]: TTSAudioPlayerEvents[K] }> = {}

  function on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]) {
    handlers[event] = handler
  }

  function postToNative(data: object) {
    window.ReactNativeWebView?.postMessage(JSON.stringify(data))
  }

  // Listen for events dispatched by the native app
  useEventListener(window, 'nativeAudioEvent' as keyof WindowEventMap, ((e: CustomEvent) => {
    const detail = e.detail
    if (!detail?.type) return

    switch (detail.type) {
      case 'playbackState':
        if (detail.state === 'playing') {
          handlers.play?.()
        }
        else if (detail.state === 'paused' || detail.state === 'stopped') {
          handlers.pause?.()
        }
        break
      case 'trackChanged':
        if (typeof detail.index === 'number') {
          handlers.trackChanged?.(detail.index)
        }
        break
      case 'queueEnded':
        handlers.allEnded?.()
        break
      case 'remoteNext':
      case 'remotePrevious':
        if (typeof detail.index === 'number') {
          handlers.trackChanged?.(detail.index)
        }
        break
    }
  }) as EventListener)

  function load(options: {
    segments: TTSSegment[]
    getAudioSrc: (segment: TTSSegment) => string
    startIndex: number
    rate: number
    metadata: { bookTitle: string, authorName: string, coverUrl: string }
  }) {
    const origin = window.location.origin
    const tracks = options.segments.map((segment, i) => ({
      index: i,
      url: new URL(options.getAudioSrc(segment), origin).href,
      title: segment.text.substring(0, 50),
    }))

    postToNative({
      type: 'load',
      tracks,
      startIndex: options.startIndex,
      rate: options.rate,
      metadata: options.metadata,
    })
  }

  function resume(): boolean {
    postToNative({ type: 'resume' })
    return true
  }

  function pause() {
    postToNative({ type: 'pause' })
  }

  function stop() {
    postToNative({ type: 'stop' })
  }

  function skipTo(index: number) {
    postToNative({ type: 'skipTo', index })
  }

  function setRate(rate: number) {
    postToNative({ type: 'setRate', rate })
  }

  return {
    load,
    resume,
    pause,
    stop,
    skipTo,
    setRate,
    on,
  }
}
