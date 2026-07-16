import type { AffiliateConfig, AffiliateCustomVoice } from '~~/server/types/affiliate'
import type { AffiliateVoiceSource } from '~~/shared/types/affiliate'
import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'
import { fetchCachedNFTClassAggregatedMetadata } from '~~/server/utils/likecoin-nft'
import { checkIsEVMAddress, checksumEVMAddress, normalizeNFTClassId } from '~~/shared/utils'
import { getLikeCoinAPIFetch } from '~~/shared/utils/api'
import { normalizeLikerId } from '~~/shared/utils/liker-id'

type UpstreamAffiliateResponse =
  & Omit<AffiliateConfig, 'affiliateClassIds' | 'affiliatePublisherWallets' | 'customVoices'>
  & {
    affiliateClassIds?: string[]
    affiliatePublisherWallets?: string[]
    customVoices?: Partial<AffiliateCustomVoice>[]
    isPlusDiscountAllowed?: boolean
  }

type AffiliateEntry = {
  config: AffiliateConfig | null
  isPlusDiscountAllowed: boolean
}

const CACHE_TTL_MS = 5 * 60 * 1000
const NEGATIVE_CACHE_TTL_MS = 30 * 1000
const CACHE_MAX_ENTRIES = 500
const cache = new Map<string, { entry: AffiliateEntry | null, expiresAt: number }>()

function isValidCustomVoice(voice: Partial<AffiliateCustomVoice>): voice is AffiliateCustomVoice {
  return typeof voice.id === 'string' && !!voice.id
    && typeof voice.name === 'string' && !!voice.name
    && typeof voice.providerVoiceId === 'string' && !!voice.providerVoiceId
}

// Shared normalization of upstream affiliate fields (lowercased class ids,
// checksummed wallets, validated voices) so the per-likerId and pool paths
// can never drift apart.
function normalizeUpstreamAffiliateFields(entry: {
  affiliateClassIds?: string[]
  affiliatePublisherWallets?: string[]
  customVoices?: Partial<AffiliateCustomVoice>[]
}) {
  return {
    affiliateClassIds: (entry.affiliateClassIds ?? []).map(id => id.toLowerCase()),
    affiliatePublisherWallets: (entry.affiliatePublisherWallets ?? [])
      .map(w => checksumEVMAddress(w))
      .filter(Boolean),
    customVoices: (entry.customVoices ?? []).filter(isValidCustomVoice),
  }
}

async function getAffiliateEntry(likerId: string): Promise<AffiliateEntry | null> {
  const key = normalizeLikerId(likerId)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.entry

  const upstream = await getLikeCoinAPIFetch()<UpstreamAffiliateResponse>(
    `/plus/affiliate/${encodeURIComponent(key)}`,
  ).catch(() => null)

  const entry: AffiliateEntry | null = upstream
    ? {
        config: upstream.active
          ? {
              active: true,
              ...normalizeUpstreamAffiliateFields(upstream),
              giftBooks: (upstream.giftBooks ?? [])
                .filter(b => typeof b?.classId === 'string' && !!b.classId)
                .map((b) => {
                  const priceIndex = Number(b.priceIndex)
                  return {
                    classId: normalizeNFTClassId(b.classId),
                    priceIndex: Number.isInteger(priceIndex) && priceIndex >= 0 ? priceIndex : 0,
                  }
                }),
              giftOnTrial: upstream.giftOnTrial,
            }
          : null,
        isPlusDiscountAllowed: !!upstream.isPlusDiscountAllowed,
      }
    : null

  // Bound the cache so unknown/spammed likerIds can't grow memory unboundedly.
  // Sweep expired entries first so short-TTL negatives don't evict valid positives;
  // fall back to FIFO (Map preserves insertion order) if we're still at capacity.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now()
    for (const [k, v] of cache) {
      if (v.expiresAt <= now) cache.delete(k)
    }
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }
  }
  // Cache negatives briefly so a transient upstream blip — or a not-yet-active
  // affiliate flipping `active: true` — doesn't lock out for the full positive TTL.
  const ttl = entry?.config ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS
  cache.set(key, { entry, expiresAt: Date.now() + ttl })
  return entry
}

export async function getAffiliateConfig(likerId: string): Promise<AffiliateConfig | null> {
  return (await getAffiliateEntry(likerId))?.config ?? null
}

export interface AffiliateVoiceSourceInternal {
  likerId: string
  isSelf: boolean
  config: AffiliateConfig
}

// Drop providerVoiceId so only browser-safe voice metadata crosses the API.
export function toPublicAffiliateVoices(voices: AffiliateCustomVoice[]): AffiliateVoiceData[] {
  return voices.map(voice => ({
    id: voice.id,
    name: voice.name,
    language: voice.language,
    avatarUrl: voice.avatarUrl,
  }))
}

// The browser-safe public shape both /plus endpoints return. `bookLimit` caps the
// book whitelist for preview callers (the anonymous pool endpoint) so it doesn't
// ship every affiliate's full catalog; omit it when the client needs the full
// scope for book matching.
export function toPublicAffiliateSource(
  source: AffiliateVoiceSourceInternal,
  { bookLimit }: { bookLimit?: number } = {},
): AffiliateVoiceSource {
  return {
    likerId: source.likerId,
    isSelf: source.isSelf,
    affiliateClassIds: bookLimit === undefined
      ? source.config.affiliateClassIds
      : source.config.affiliateClassIds.slice(0, bookLimit),
    affiliatePublisherWallets: source.config.affiliatePublisherWallets,
    customVoices: toPublicAffiliateVoices(source.config.customVoices),
  }
}

// The affiliate configs a Plus user may draw voices from: their own publisher
// config plus the affiliate they were referred by. Both resolve through the
// existing per-likerId cache, so this adds no new upstream surface.
export async function getUserAffiliateSources(
  user: { likerId?: string, plusAffiliateFrom?: string },
): Promise<AffiliateVoiceSourceInternal[]> {
  const selfLikerId = user.likerId ? normalizeLikerId(user.likerId) : undefined
  const referrerLikerId = user.plusAffiliateFrom ? normalizeLikerId(user.plusAffiliateFrom) : undefined
  const likerIds = [selfLikerId, referrerLikerId]
    .filter((id, i, arr) => !!id && arr.indexOf(id) === i) as string[]
  const configs = await Promise.all(likerIds.map(id => getAffiliateConfig(id)))
  const sources: AffiliateVoiceSourceInternal[] = []
  likerIds.forEach((likerId, i) => {
    const config = configs[i]
    if (!config?.active) return
    sources.push({ likerId, isSelf: likerId === selfLikerId, config })
  })
  return sources
}

export async function getAffiliatePlusDiscountAllowed(likerId: string): Promise<boolean> {
  return (await getAffiliateEntry(likerId))?.isPlusDiscountAllowed ?? false
}

type UpstreamAllVoicesResponse = {
  affiliates?: {
    likerId?: string
    affiliateClassIds?: string[]
    affiliatePublisherWallets?: string[]
    customVoices?: Partial<AffiliateCustomVoice>[]
  }[]
}

const ALL_VOICES_CACHE_TTL_MS = 5 * 60 * 1000
let allVoicesCache: { sources: AffiliateVoiceSourceInternal[], expiresAt: number } | null = null

// Every active affiliate's voice config — the Civic premium-voice pool. Voices
// stay usable only on whitelisted books: callers must still gate each book via
// isBookInAffiliateVoiceScope. Returns [] until the upstream endpoint exists.
export async function getAllAffiliateVoiceSources(): Promise<AffiliateVoiceSourceInternal[]> {
  if (allVoicesCache && allVoicesCache.expiresAt > Date.now()) return allVoicesCache.sources
  const upstream = await getLikeCoinAPIFetch()<UpstreamAllVoicesResponse>('/plus/voices')
    .catch(() => null)
  const sources: AffiliateVoiceSourceInternal[] = (upstream?.affiliates ?? [])
    .filter((entry): entry is typeof entry & { likerId: string } =>
      typeof entry.likerId === 'string' && !!entry.likerId)
    .map(entry => ({
      likerId: normalizeLikerId(entry.likerId),
      isSelf: false,
      config: {
        active: true,
        ...normalizeUpstreamAffiliateFields(entry),
        giftBooks: [],
        giftOnTrial: false,
      },
    }))
    .filter(source => source.config.customVoices.length > 0)
  // Cache failures briefly so an upstream blip doesn't blank the pool for long.
  const ttl = upstream ? ALL_VOICES_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS
  allVoicesCache = { sources, expiresAt: Date.now() + ttl }
  return sources
}

// The affiliate voice sources a subscriber may draw from. Plus: self +
// referrer. Civic: additionally every active affiliate's voices (own sources
// first for correct isSelf flags, pool deduped by likerId). The per-book
// whitelist is enforced by callers via isBookInAffiliateVoiceScope regardless.
export async function getAffiliateVoiceSourcesForUser(
  user: { likerId?: string, plusAffiliateFrom?: string, likerPlusTier?: LikerPlusTier },
): Promise<AffiliateVoiceSourceInternal[]> {
  if (user.likerPlusTier !== 'civic') return getUserAffiliateSources(user)
  const [own, all] = await Promise.all([
    getUserAffiliateSources(user),
    getAllAffiliateVoiceSources(),
  ])
  const seen = new Set(own.map(source => source.likerId))
  return [...own, ...all.filter(source => !seen.has(source.likerId))]
}

// A book is in scope when it is explicitly listed in `affiliateClassIds`, or
// when it is listed in the bookstore by one of the affiliate's publisher
// wallets — letting a publisher whitelist their wallet instead of each book.
export async function isBookInAffiliateVoiceScope(config: AffiliateConfig, nftClassId: string): Promise<boolean> {
  if (config.affiliateClassIds.includes(nftClassId.toLowerCase())) return true
  if (!config.affiliatePublisherWallets.length) return false
  // Only on-chain NFT class IDs can have bookstore metadata; skip uploaded-book
  // and preview IDs so we don't make guaranteed-failing upstream calls.
  if (!checkIsEVMAddress(nftClassId)) return false
  const metadata = await fetchCachedNFTClassAggregatedMetadata(nftClassId, ['bookstore'])
    .catch(() => null)
  const ownerWallet = checksumEVMAddress(metadata?.bookstoreInfo?.ownerWallet)
  return !!ownerWallet && config.affiliatePublisherWallets.includes(ownerWallet)
}
