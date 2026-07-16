import type { PlusAffiliateSourcesResponse } from '~~/shared/types/affiliate'
import { getAffiliateVoiceSourcesForUser, toPublicAffiliateSource } from '~~/server/utils/affiliate'

export default defineEventHandler(async (event): Promise<PlusAffiliateSourcesResponse> => {
  const session = await requireUserSession(event)
  // Affiliate voices are Plus-only, so gate at the boundary (matching the check
  // in reader/tts.get.ts) to avoid resolving sources for sessions that can't use them.
  if (!session.user.isLikerPlus) {
    throw createError({ status: 402, message: 'REQUIRE_LIKER_PLUS' })
  }
  // Tier-appropriate voice sources (Civic adds the full affiliate pool, still
  // book-scoped client- and server-side). providerVoiceId is stripped at this
  // browser boundary; synthesis re-resolves it in reader/tts.get.ts.
  const sources = await getAffiliateVoiceSourcesForUser(session.user)
  return { sources: sources.map(source => toPublicAffiliateSource(source)) }
})
