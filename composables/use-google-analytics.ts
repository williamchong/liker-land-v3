export function useGoogleAnalytics() {
  const { gtag } = useGtag()
  const googleAnalyticsTrackingId: string | undefined = useRuntimeConfig().public.googleAnalyticsTrackingId

  const gaClientId = ref('')
  const gaSessionId = ref('')

  onMounted(() => {
    if (gtag && googleAnalyticsTrackingId) {
      gtag('get', googleAnalyticsTrackingId, 'client_id', (clientId) => {
        gaClientId.value = clientId as string
      })
      gtag('get', googleAnalyticsTrackingId, 'session_id', (clientId) => {
        gaSessionId.value = clientId as string
      })
    }
  })

  return {
    gaClientId,
    gaSessionId,
  }
}
