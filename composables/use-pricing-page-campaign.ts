import { computed, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue'

interface PricingPageCampaign {
  type: 'image' | 'video' | 'custom'
  title?: string
  description?: string
}

const CAMPAIGNS: Record<string, PricingPageCampaign> = {
  'blocktrend-plus': {
    type: 'custom',
  },
  'fragmentedtime': {
    type: 'video',
    title: '善用碎片時間，自我增值',
    description: '上班族必備！在午休、上班途中，甚至做運動時聽書，放鬆身心和汲取新知！',
  },
}

export function usePricingPageCampaign(options: {
  campaignId: MaybeRefOrGetter<string | undefined>
} = { campaignId: undefined }) {
  const { $posthog } = useNuxtApp()
  const experimentKey = 'pricing-page-campaign'
  const campaignId = computed(() => toValue(options.campaignId))
  const experimentVariant = ref<string | null>(null)

  const resolvedCampaignId = computed(() => {
    // If campaign ID is explicitly provided, use it
    if (campaignId.value) return campaignId.value
    // Otherwise, use the experiment variant if available
    return experimentVariant.value
  })

  const campaignContent = computed(() => {
    if (!resolvedCampaignId.value) return undefined
    const content = CAMPAIGNS[resolvedCampaignId.value]
    if (!content) return undefined
    const { type } = content
    return {
      id: resolvedCampaignId.value,
      ...content,
      isVideo: type === 'video',
      isImage: type === 'image',
      isCustom: type === 'custom',
    }
  })

  const isBlocktrendCampaign = computed(() => {
    return resolvedCampaignId.value === 'blocktrend-plus'
  })

  onMounted(() => {
    if ($posthog) {
      const posthog = $posthog()
      // If campaignId is explicitly set via query string, override the feature flag
      if (campaignId.value) {
        posthog.featureFlags.overrideFeatureFlags({
          [experimentKey]: campaignId.value,
        })
      }
      else {
        // Otherwise, fetch experiment variant if experimentKey is provided
        const updateVariant = () => {
          const flag = posthog.getFeatureFlag(experimentKey)
          experimentVariant.value = typeof flag === 'string' ? flag : null
        }
        posthog.onFeatureFlags(() => {
          updateVariant()
        })
        updateVariant()
      }
    }
  })

  return {
    campaignContent,
    isBlocktrendCampaign,
  }
}
