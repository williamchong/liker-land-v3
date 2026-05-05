// Single entry point for Intercom on web. Picks among the native RN SDK
// bridge, the window.Intercom JS SDK, and a mailto fallback so call sites
// don't have to branch on isApp / SDK availability themselves.

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

  function show(): OpenResult {
    if (isApp.value) {
      if (isNativeIntercomAvailable()) {
        postToNative({ type: 'intercomShow' })
        return { method: 'chat' }
      }
      openMailto()
      return { method: 'link' }
    }
    if (isWebIntercomReady()) {
      window.Intercom('show')
      return { method: 'chat' }
    }
    openMailto()
    return { method: 'link' }
  }

  function showNewMessage(message?: string, mailtoSubject?: string): OpenResult {
    if (isApp.value) {
      if (isNativeIntercomAvailable()) {
        postToNative({ type: 'intercomShowNewMessage', message })
        return { method: 'chat' }
      }
      openMailto(mailtoSubject ?? message, message)
      return { method: 'link' }
    }
    if (isWebIntercomReady()) {
      window.Intercom('showNewMessage', message ?? '')
      return { method: 'chat' }
    }
    openMailto(mailtoSubject ?? message, message)
    return { method: 'link' }
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
