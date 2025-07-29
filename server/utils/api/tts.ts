import type { UserDocData } from './user'
import type { UserSession } from '#auth-utils'

export function isTTSAvailable(session: UserSession, userDoc: UserDocData | undefined): boolean {
  if (!session || !session.user) return false
  const isLikerPlus = session.user.isLikerPlus || false
  if (isLikerPlus) return true
  if (!userDoc || !userDoc.ttsCharactersUsed || userDoc.ttsCharactersUsed as number < 300) return true
  return false
}
