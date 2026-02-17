export function useNativeAudioBridge() {
  const { isApp } = useAppDetection()

  let isNativeAudioEnabled = false
  if (import.meta.client) {
    try {
      const { $posthog } = useNuxtApp()
      if ($posthog) {
        isNativeAudioEnabled = $posthog().isFeatureEnabled('native-audio') ?? false
      }
    }
    catch {
      // PostHog not yet available
    }
  }

  const isNativeBridge = computed(() =>
    import.meta.client && isApp.value && !!window.ReactNativeWebView && isNativeAudioEnabled,
  )

  return { isNativeBridge: readonly(isNativeBridge) }
}
