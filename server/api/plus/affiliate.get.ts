import type { PlusAffiliateSourcesResponse } from '~~/shared/types/affiliate'
import { getUserAffiliateSources, toPublicAffiliateVoices } from '~~/server/utils/affiliate'

export default defineEventHandler(async (event): Promise<PlusAffiliateSourcesResponse> => {
  const session = await requireUserSession(event)
  // Affiliate voices are Plus-only, so gate at the boundary (matching the check
  // in reader/tts.get.ts) to avoid resolving sources for sessions that can't use them.
  if (!session.user.isLikerPlus) {
    throw createError({ status: 402, message: 'REQUIRE_LIKER_PLUS' })
  }
  // Self + referrer voice sources. providerVoiceId is stripped at this browser
  // boundary; synthesis re-resolves it server-side in reader/tts.get.ts.
  const sources = await getUserAffiliateSources(session.user)
  return {
    sources: sources.map(source => ({
      likerId: source.likerId,
      isSelf: source.isSelf,
      affiliateClassIds: source.config.affiliateClassIds,
      affiliatePublisherWallets: source.config.affiliatePublisherWallets,
      customVoices: toPublicAffiliateVoices(source.config.customVoices),
    })),
  }
})
