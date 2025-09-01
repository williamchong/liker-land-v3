export interface PaywallModalProps {
  'modelValue'?: SubscriptionPlan
  'isFullscreen'?: boolean
  'isBackdropDismissible'?: boolean
  'isCloseButtonHidden'?: boolean
  'isProcessingSubscription'?: boolean
  'hasFreeTrial'?: boolean
  'mustCollectPaymentMethod'?: boolean
  'utmCampaign'?: string
  'utmMedium'?: string
  'utmSource'?: string
  'onUpdate:modelValue'?: (value: SubscriptionPlan) => void
  'onSubscribe'?: (props: {
    hasFreeTrial?: boolean
    mustCollectPaymentMethod?: boolean
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
  }) => void
  'onOpen'?: () => void
  'onClose'?: () => void
}
