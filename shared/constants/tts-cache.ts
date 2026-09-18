// Workbox cache holding TTS segment audio. Shared with nuxt.config.ts, which
// declares the route, and with clearCaches, which must name it explicitly —
// Workbox cache names carry no cacheKeyPrefix, so a prefix purge misses them.
export const TTS_AUDIO_CACHE = 'tts-audio'

// Offline downloads, apart from the lookahead above so its Workbox expiration
// never evicts one. The service worker picks this cache by the request header.
export const TTS_AUDIO_DOWNLOAD_CACHE = 'tts-audio-downloads'
export const TTS_AUDIO_DOWNLOAD_HEADER = 'x-tts-download'

// Bump to invalidate every cached segment — browser, CDN edge and app shell
// alike, as all three key on the URL — after a voice or model change. Empty
// leaves the param off, so introducing it busts nothing.
export const TTS_AUDIO_VERSION = ''
export const TTS_AUDIO_VERSION_PARAM = 'av'
