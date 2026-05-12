import type { AffiliatePublicConfig } from '~/shared/types/affiliate'
import { normalizeLikerId } from '~/shared/utils/liker-id'

export function useLinkAffiliate(from: MaybeRefOrGetter<string | undefined>) {
  const { user } = useUserSession()

  const loadedConfig = useState<AffiliatePublicConfig | null>('link-affiliate-config', () => null)
  const loadedFrom = useState<string | null>('link-affiliate-loaded-from', () => null)
  const isLoading = useState<boolean>('link-affiliate-loading', () => false)

  async function fetchConfig() {
    const fromValue = toValue(from)
    if (!fromValue?.startsWith('@') || !user.value?.isLikerPlus) {
      loadedConfig.value = null
      loadedFrom.value = null
      return
    }
    if (loadedFrom.value === fromValue || isLoading.value) return
    isLoading.value = true
    try {
      const likerId = normalizeLikerId(fromValue)
      loadedConfig.value = await $fetch<AffiliatePublicConfig>(
        `/api/affiliate/${encodeURIComponent(likerId)}`,
      )
      loadedFrom.value = fromValue
    }
    catch (error) {
      console.error('[LinkAffiliate] Failed to fetch:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  watchImmediate(
    [() => toValue(from), () => user.value?.isLikerPlus],
    fetchConfig,
  )

  return {
    config: loadedConfig,
    fetchConfig,
  }
}
