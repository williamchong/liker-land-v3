import type { LikerInfoResponseData } from '~~/shared/types/api'

export function getLikeCoinAPIFetch() {
  const config = useRuntimeConfig()
  // Bound wedged requests (see createRetryingFetch) so a hung upstream can't
  // stall a caller indefinitely — the For You portrait fans out ~50 of these.
  return createRetryingFetch({ baseURL: config.public.likeCoinAPIEndpoint, timeout: API_FETCH_TIMEOUT_MS })
}

export function fetchLikerProfileInfo(
  token: string,
): Promise<LikerInfoResponseData> {
  const fetch = getLikeCoinAPIFetch()
  return fetch<LikerInfoResponseData>(`/users/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function fetchLikerPublicInfoByWalletAddress(
  walletAddress: string,
  options: { nocache?: boolean } = {},
): Promise<LikerInfoResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const query: Record<string, string> = {}
  if (options.nocache) query.ts = `${Date.now()}`
  return fetch<LikerInfoResponseData>(`/users/addr/${walletAddress}/min`, { query })
}

export function fetchUserRegisterCheck({
  accountId,
  walletAddress,
  email,
  magicDIDToken,
}: {
  accountId?: string
  walletAddress?: string
  email?: string
  magicDIDToken?: string
}) {
  const fetch = getLikeCoinAPIFetch()
  return fetch(`/users/new/check`, {
    method: 'POST',
    body: {
      user: accountId,
      evmWallet: walletAddress,
      email,
      magicDIDToken,
    },
  })
}

export function fetchLikerPublicInfoById(id: string, options: { nocache?: boolean } = {}): Promise<LikerInfoResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const query: Record<string, string> = {}
  if (options.nocache) query.ts = `${Date.now()}`
  return fetch<LikerInfoResponseData>(`/users/id/${id}/min`, { query })
}

export const likeCoinNFTClassAggregatedMetadataOptions = [
  'class_chain',
  'class_api',
  'iscn',
  'purchase',
  'bookstore',
] as const
export type LikeCoinNFTClassAggregatedMetadataOptionKey = typeof likeCoinNFTClassAggregatedMetadataOptions[number]
export interface FetchLikeCoinNFTClassAggregatedMetadataOptions {
  include?: LikeCoinNFTClassAggregatedMetadataOptionKey[]
  exclude?: LikeCoinNFTClassAggregatedMetadataOptionKey[]
  nocache?: boolean
  // LikeCoin session token. Sent so an owner or moderator still sees their own
  // pending-review listing; a tokened response is never shared-cached.
  token?: string
}

export interface FetchLikeCoinNFTClassAggregatedMetadataResponseData {
  classData: NFTClassMetadata | null
  ownerInfo: Record<string, NFTIdList> | null
  bookstoreInfo: BookstoreInfo | null
  // Set with a null bookstoreInfo when the listing is withheld pending review,
  // which is what separates it from a class that was never listed at all.
  isBookstorePendingReview?: boolean
}

export function resolveLikeCoinNFTMetadataDataOptions(
  options: FetchLikeCoinNFTClassAggregatedMetadataOptions = {},
): LikeCoinNFTClassAggregatedMetadataOptionKey[] {
  const included = new Set(options.include || likeCoinNFTClassAggregatedMetadataOptions)
  const excluded = new Set(options.exclude || [])
  return [...included].filter(option => !excluded.has(option))
}

export function fetchLikeCoinNFTClassAggregatedMetadataById(
  nftClassId: string,
  options: FetchLikeCoinNFTClassAggregatedMetadataOptions = { exclude: [], nocache: false },
) {
  const fetch = getLikeCoinAPIFetch()
  const query: Record<string, string | string[]> = {
    class_id: normalizeNFTClassId(nftClassId),
    data: resolveLikeCoinNFTMetadataDataOptions(options),
  }
  if (options.nocache) query.ts = `${Math.round(Date.now() / 1000)}`
  return fetch<FetchLikeCoinNFTClassAggregatedMetadataResponseData>('/likerland/nft/metadata', {
    query,
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
  })
}

/**
 * On the server, routes through our `/api/nft/:id/metadata` endpoint, which
 * wraps the upstream call in a short shared cache to collapse the blocking SSR
 * fetch (Cloud Run CPU). On the client it hits LikeCoin directly: the upstream
 * is already Cloudflare-cached, so an extra hop through our server would only
 * add latency. The payload is book-level (not session-scoped), so caching is
 * safe and does not affect per-user rendering.
 */
export function fetchCachedLikeCoinNFTClassAggregatedMetadataById(
  nftClassId: string,
  options: FetchLikeCoinNFTClassAggregatedMetadataOptions = { exclude: [], nocache: false },
) {
  // A tokened request bypasses the shared cache anyway, so the internal hop is pure cost.
  if (import.meta.client || options.token) {
    return fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId, options)
  }
  const query: Record<string, string | string[]> = {
    data: resolveLikeCoinNFTMetadataDataOptions(options),
  }
  if (options.nocache) query.nocache = '1'
  return $fetch<FetchLikeCoinNFTClassAggregatedMetadataResponseData>(
    `/api/nft/${normalizeNFTClassId(nftClassId)}/metadata`,
    { query },
  )
}

export interface FetchBuyerMessageResponseData {
  messages: NFTBuyerMessage[]
}

export function fetchPurchaseMessagesByNFTClassId(nftClassId: string) {
  const fetch = getLikeCoinAPIFetch()
  return fetch<FetchBuyerMessageResponseData>(`/likernft/book/purchase/${nftClassId}/messages`)
}
