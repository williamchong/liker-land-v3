import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { TTS_TRIAL_CHARACTER_LIMIT } from '~~/shared/utils/tts-trial'

export function generateTTSKey(): string {
  return randomBytes(16).toString('hex')
}

export interface TTSRequestParams {
  text: string
  language: string
  voiceId: string
  customMiniMaxVoiceId?: string
  session?: Awaited<ReturnType<typeof requireUserSession>>
  config?: ReturnType<typeof useRuntimeConfig>
}

// Provider-neutral generation metadata. MiniMax's richer `ExtraInfo`
// structurally satisfies this, keeping the vendor type out of the generic
// provider contract.
export interface TTSExtraInfo {
  audioLength?: number
  wordCount?: number
  invisibleCharacterRatio?: number
  usageCharacters?: number
  bitrate?: number
}

export interface TTSProviderResult {
  audio: Buffer
  extraInfo?: TTSExtraInfo
  traceId?: string
}

export interface TTSProviderStreamResult {
  audio: ReadableStream<Buffer>
  // extraInfo/traceId ride the final aggregated SSE chunk and only settle once
  // `audio` is fully drained — awaiting either before the stream is consumed
  // hangs the underlying source. Resolve them in the cache TransformStream's
  // flush(), where the source is guaranteed drained.
  extraInfo: Promise<TTSExtraInfo | undefined>
  traceId: Promise<string | undefined>
}

export interface BaseTTSProvider {
  provider: string
  format: string
  processRequest(params: TTSRequestParams): Promise<TTSProviderResult>
  processRequestStream(params: TTSRequestParams): Promise<TTSProviderStreamResult>
}

// Flattens generation metadata into analytics event props. audioLength is in
// milliseconds; pairing it with textLength yields the speech-rate ratio used
// (Phase 2) to flag noise-blast / truncation failures.
export function getTTSExtraInfoEventProps(extraInfo?: TTSExtraInfo, traceId?: string) {
  return {
    traceId,
    audioLengthMs: extraInfo?.audioLength,
    wordCount: extraInfo?.wordCount,
    invisibleCharacterRatio: extraInfo?.invisibleCharacterRatio,
    usageCharacters: extraInfo?.usageCharacters,
    bitrate: extraInfo?.bitrate,
  }
}

export async function getUserTTSAvailable(event: H3Event): Promise<boolean> {
  const session = await getUserSession(event)
  if (!session || !session.user) return false
  const isLikerPlus = session.user.isLikerPlus || false
  if (isLikerPlus) return true
  const userDoc = await getUserDoc(session.user.evmWallet)
  if (!userDoc || !userDoc.ttsCharactersUsed || userDoc.ttsCharactersUsed as number < TTS_TRIAL_CHARACTER_LIMIT) return true
  return false
}
