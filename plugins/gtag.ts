export default defineNuxtPlugin(() => {
  const { gtag } = useGtag()
  const googleAnalyticsTrackingId = useRuntimeConfig().public.googleAnalyticsTrackingId as string
  if (gtag && googleAnalyticsTrackingId) {
    const clientId = getRouteQuery('ga_client_id')
    const sessionId = getRouteQuery('ga_session_id')
    gtag('config', googleAnalyticsTrackingId, {
      client_id: clientId,
      session_id: sessionId,
    })
  }
})
