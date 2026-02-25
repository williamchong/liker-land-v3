export function useNativeAudioBridge() {
  const { isApp } = useAppDetection()

  const isNativeAudioEnabled = ref(false)
  if (import.meta.client) {
    try {
      const { $posthog } = useNuxtApp()
      if ($posthog) {
        const posthog = $posthog()
        posthog.onFeatureFlags(() => {
          isNativeAudioEnabled.value = posthog.isFeatureEnabled('native-audio') ?? false
        })
        isNativeAudioEnabled.value = posthog.isFeatureEnabled('native-audio') ?? false
      }
    }
    catch {
      // PostHog not yet available
    }
  }

  const isNativeBridge = computed(() =>
    import.meta.client && isApp.value && !!window.ReactNativeWebView && isNativeAudioEnabled.value,
  )

  return { isNativeBridge: readonly(isNativeBridge) }
}
