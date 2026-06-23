import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'

export interface AffiliatePublicGiftBook {
  classId: string
  priceIndex: number
  name?: string
  cover?: string
}

export type AffiliatePublicConfig =
  | {
    active: false
    isPlusDiscountAllowed?: boolean
  }
  | {
    active: true
    giftBooks?: AffiliatePublicGiftBook[]
    giftOnTrial?: boolean
    isPlusDiscountAllowed?: boolean
    affiliateClassIds: string[]
    affiliatePublisherWallets: string[]
    customVoices: AffiliateVoiceData[]
  }

// One affiliate config a Plus user may draw TTS voices from — either their own
// publisher config (isSelf) or the affiliate they were referred by. Carries the
// scope fields needed for client-side book matching; providerVoiceId is stripped.
export interface AffiliateVoiceSource {
  likerId: string
  isSelf: boolean
  affiliateClassIds: string[]
  affiliatePublisherWallets: string[]
  customVoices: AffiliateVoiceData[]
}

export interface PlusAffiliateSourcesResponse {
  sources: AffiliateVoiceSource[]
}
