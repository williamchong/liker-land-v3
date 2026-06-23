import type { AffiliatePublicConfig, AffiliateVoiceSource, PlusAffiliateSourcesResponse } from '~~/shared/types/affiliate'
import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'
import { checksumEVMAddress } from '~~/shared/utils'

// A book is in scope when explicitly listed in affiliateClassIds, or when owned
// by one of the affiliate's publisher wallets. Mirrors the server-side check in
// server/utils/affiliate.ts (display-only; synthesis re-verifies).
function isBookInScope(
  scope: { affiliateClassIds: string[], affiliatePublisherWallets: string[] },
  nftClassId: string,
  ownerWallet?: string,
): boolean {
  if (scope.affiliateClassIds.includes(nftClassId.toLowerCase())) return true
  const checksummedOwnerWallet = checksumEVMAddress(ownerWallet)
  return !!checksummedOwnerWallet && scope.affiliatePublisherWallets.includes(checksummedOwnerWallet)
}

export function getAffiliateVoicesForBook(
  config: AffiliatePublicConfig | null,
  nftClassId: string | undefined,
  ownerWallet?: string,
): AffiliateVoiceData[] {
  if (!config?.active || !nftClassId) return []
  return isBookInScope(config, nftClassId, ownerWallet) ? config.customVoices : []
}

export function getAffiliateVoicesFromSources(
  sources: AffiliateVoiceSource[],
  nftClassId: string | undefined,
  ownerWallet?: string,
): AffiliateVoiceData[] {
  if (!nftClassId) return []
  // Voice ids are globally unique, so dedupe in case self and referrer both
  // scope the same book and surface a shared voice.
  const seen = new Set<string>()
  const voices: AffiliateVoiceData[] = []
  for (const source of sources) {
    if (!isBookInScope(source, nftClassId, ownerWallet)) continue
    for (const voice of source.customVoices) {
      if (seen.has(voice.id)) continue
      seen.add(voice.id)
      voices.push(voice)
    }
  }
  return voices
}

export function usePlusAffiliate() {
  const { loggedIn, user } = useUserSession()

  const sources = useState<AffiliateVoiceSource[]>('plus-affiliate-sources', () => [])
  // Track which identity the cached sources belong to so a session refresh that
  // swaps attribution (or likerId) triggers a refetch instead of serving stale
  // sources. Both likerId and plusAffiliateFrom feed the resolved set.
  const loadedFor = useState<string | null>('plus-affiliate-loaded-for', () => null)
  const isLoading = useState<boolean>('plus-affiliate-loading', () => false)

  function identityKey() {
    // Plus status is part of the key so an upgrade/downgrade invalidates the cache:
    // sources are Plus-gated, so the resolved set differs across that boundary.
    return `${user.value?.likerId ?? ''}|${user.value?.plusAffiliateFrom ?? ''}|${user.value?.isLikerPlus ? '1' : '0'}`
  }

  function clearSources() {
    sources.value = []
    loadedFor.value = null
  }

  async function fetchConfig() {
    if (!loggedIn.value) {
      clearSources()
      return
    }
    const identity = identityKey()
    if (loadedFor.value === identity || isLoading.value) return
    // Affiliate voices are Plus-only and the endpoint enforces it, so skip the
    // fetch for non-Plus sessions while recording the identity so we don't retry.
    // An upgrade changes identityKey, which invalidates this and triggers a fetch.
    if (!user.value?.isLikerPlus) {
      sources.value = []
      loadedFor.value = identity
      return
    }
    isLoading.value = true
    try {
      const data = await apiFetch<PlusAffiliateSourcesResponse>('/plus/affiliate')
      // The session may have changed while the request was in flight. On logout,
      // clear so a prior user's voices don't linger; on an identity swap, skip the
      // stale write and let the next fetch repopulate for the new identity.
      if (!loggedIn.value) {
        clearSources()
        return
      }
      if (identityKey() !== identity) return
      sources.value = data?.sources ?? []
      loadedFor.value = identity
    }
    catch (error) {
      console.error('[PlusAffiliate] Failed to fetch:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  function voicesForBook(
    nftClassId: MaybeRefOrGetter<string | undefined>,
    ownerWallet?: MaybeRefOrGetter<string | undefined>,
  ): AffiliateVoiceData[] {
    return getAffiliateVoicesFromSources(sources.value, toValue(nftClassId), toValue(ownerWallet))
  }

  return {
    sources,
    fetchConfig,
    voicesForBook,
  }
}
