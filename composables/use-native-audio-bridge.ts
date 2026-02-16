export function useNativeAudioBridge() {
  const { isApp } = useAppDetection()

  const isNativeBridge = computed(() =>
    import.meta.client && isApp.value && !!window.ReactNativeWebView,
  )

  return { isNativeBridge: readonly(isNativeBridge) }
}
