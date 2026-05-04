import type { AffiliateVoiceData } from '~/shared/types/custom-voice'

export interface PricingPageContentProps {
  modelValue?: SubscriptionPlan
  isProcessingSubscription?: boolean
  trialPeriodDays?: number
  mustCollectPaymentMethod?: boolean
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  coupon?: string
  affiliateVoices?: AffiliateVoiceData[]
  affiliateLikerId?: string
}
