// Static example text for the public TTS sample endpoint. Hardcoding the text
// per language closes the abuse vector: without auth + sig, an arbitrary
// `text=` param would let anyone burn Minimax tokens against our cache. With
// fixed text, every cache miss synthesizes at most once per (voice, language).
export type TTSSampleLanguage = 'en-US' | 'zh-TW' | 'zh-HK'

export const TTS_SAMPLE_TEXT_BY_LANGUAGE: Record<TTSSampleLanguage, string> = {
  'zh-HK': '其實我一直覺得，閱讀是一件很浪漫的事。不管是手捧著實體書，還是滑著電子螢幕，只要沉浸在故事裡，就能暫時忘掉現實的煩惱，去到一個完全不同的時空。',
  'zh-TW': '其實我一直覺得，閱讀是一件很浪漫的事。不管是手捧著實體書，還是滑著電子螢幕，只要沉浸在故事裡，就能暫時忘掉現實的煩惱，去到一個完全不同的時空。',
  'en-US': 'I\'ve always felt that reading is something truly romantic. Whether you\'re holding a physical book or scrolling on a screen, as long as you\'re immersed in a story, you can briefly forget your worries and travel to an entirely different world.',
}

export function getTTSSampleText(language: TTSSampleLanguage): string {
  return TTS_SAMPLE_TEXT_BY_LANGUAGE[language]
}
