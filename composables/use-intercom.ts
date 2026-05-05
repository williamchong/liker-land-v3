// Single entry point for Intercom on web. Picks among the native RN SDK
// bridge, the window.Intercom JS SDK, and a mailto fallback so call sites
// don't have to branch on bridge / SDK availability themselves. The web
// SDK branch is gated on !isApp because plugins/intercom.client.ts hides
// the messenger via CSS in app mode (real app or ?app=1) — calling
// Intercom('show') there opens an invisible UI.

const SUPPORT_EMAIL = 'cs@3ook.com'

type OpenResult = { method: 'chat' | 'link' }

function openMailto(subject?: string, body?: string): void {
  let mailto = `mailto:${SUPPORT_EMAIL}`
  const params: string[] = []
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  if (params.length) mailto += `?${params.join('&')}`
  window.open(mailto, '_blank')
}

export function useIntercom() {
  const { isApp } = useAppDetection()

  function dispatch(
    native: () => void,
    web: () => void,
    fallback: () => void,
  ): OpenResult {
    if (isNativeIntercomAvailable()) {
      native()
      return { method: 'chat' }
    }
    if (!isApp.value && isWebIntercomReady()) {
      web()
      return { method: 'chat' }
    }
    fallback()
    return { method: 'link' }
  }

  function show(): OpenResult {
    return dispatch(
      () => postToNative({ type: 'intercomShow' }),
      () => window.Intercom('show'),
      () => openMailto(),
    )
  }

  function showNewMessage(message?: string, mailtoSubject?: string): OpenResult {
    return dispatch(
      () => postToNative({ type: 'intercomShowNewMessage', message }),
      () => window.Intercom('showNewMessage', message ?? ''),
      () => openMailto(mailtoSubject ?? message, message),
    )
  }

  function trackEvent(name: string, params?: Record<string, unknown>): void {
    if (isNativeIntercomAvailable()) {
      postToNative({ type: 'intercomTrackEvent', name, metaData: params })
      return
    }
    if (isWebIntercomReady()) {
      window.Intercom('trackEvent', name, params)
    }
  }

  return { show, showNewMessage, trackEvent }
}
