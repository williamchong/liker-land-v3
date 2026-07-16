import type { PlusAffiliateSourcesResponse } from '~~/shared/types/affiliate'
import { CIVIC_VOICES_PREVIEW_BOOK_LIMIT } from '~~/shared/constants/affiliate'
import { getAllAffiliateVoiceSources, toPublicAffiliateSource } from '~~/server/utils/affiliate'

// Public preview of the Civic premium-voice pool: every active affiliate's
// voices with their book scope, so the member page can show what Civic unlocks
// before subscribing. Book access is still enforced per-book at synthesis time;
// providerVoiceId is stripped at this browser boundary. The book whitelist is
// capped to a preview slice (+1 lets the client tell more exist) so this
// anonymous endpoint never ships the full catalog.
export default defineEventHandler(async (): Promise<PlusAffiliateSourcesResponse> => {
  const sources = await getAllAffiliateVoiceSources()
  return {
    sources: sources.map(source =>
      toPublicAffiliateSource(source, { bookLimit: CIVIC_VOICES_PREVIEW_BOOK_LIMIT + 1 })),
  }
})
