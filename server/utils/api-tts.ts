import type { H3Event } from 'h3'

export enum TTSProvider {
  COZY = 'cozy',
  MINIMAX = 'minimax',
}
export interface TTSRequestParams {
  text: string
  language: string
  voiceId: string
  session: Awaited<ReturnType<typeof requireUserSession>>
  config: ReturnType<typeof useRuntimeConfig>
}

export interface BaseTTSProvider {
  provider: TTSProvider
  format: string
  processRequest(params: TTSRequestParams): Promise<ReadableStream>
  createProcessStream(cacheWriteOptions: { isCacheEnabled: boolean, audioChunks: Buffer[], handleCacheWrite: () => void }): ReadableWritablePair
}

export async function getUserTTSAvailable(event: H3Event): Promise<boolean> {
  const session = await getUserSession(event)
  if (!session || !session.user) return false
  const isLikerPlus = session.user.isLikerPlus || false
  if (isLikerPlus) return true
  const userDoc = await getUserDoc(session.user.evmWallet)
  if (!userDoc || !userDoc.ttsCharactersUsed || userDoc.ttsCharactersUsed as number < 300) return true
  return false
}
