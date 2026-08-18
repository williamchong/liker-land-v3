// Single entry point for Intercom on web. Picks among the native RN SDK
// bridge, the web SDK, and a mailto fallback so call sites don't have to
// branch on bridge / SDK availability themselves.

type OpenResult = { method: 'chat' | 'link' }

// Registered by the Intercom plugin; undefined in app, where it skips the web
// SDK. Held as the script rather than its proxy: Nuxt Scripts swaps `.proxy`
// from recording to forwarding on load, so a captured proxy stops delivering.
type IntercomScript = Pick<ReturnType<typeof useScriptIntercom>, 'proxy' | 'onLoaded'>
let intercomScript: IntercomScript | undefined

// A logout before the widget boots cannot end Intercom's own session, and a
// queued shutdown is wrong: a re-login in the meantime would boot the messenger
// and then immediately kill it. Decide at load, off the session state by then.
let hasPendingShutdown = false
let hasShutDown = false

export function setIntercomScript(script: IntercomScript | undefined): void {
  intercomScript = script
}

function openMailto(subject?: string, body?: string): void {
  let mailto = `mailto:${CUSTOMER_SERVICE_EMAIL}`
  const params: string[] = []
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  if (params.length) mailto += `?${params.join('&')}`
  window.open(mailto, '_blank')
}

export function useIntercom() {
  function dispatch(
    native: () => void,
    web: () => void,
    fallback: () => void,
  ): OpenResult {
    if (isNativeIntercomAvailable()) {
      native()
      return { method: 'chat' }
    }
    if (isWebIntercomReady()) {
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

  // Queued through the script proxy rather than window.Intercom: the widget
  // loads on a timer, and unlike show/showNewMessage a late replay is harmless.
  function trackEvent(name: string, params?: Record<string, unknown>): void {
    if (isNativeIntercomAvailable()) {
      postToNative({ type: 'intercomTrackEvent', name, metaData: params })
      return
    }
    intercomScript?.proxy.Intercom('trackEvent', name, params)
  }

  // Runs immediately once the widget is up, since onLoaded fires straight away
  // after load; before that it waits, and a re-login wins the race.
  function shutdown(): void {
    hasPendingShutdown = true
    const script = intercomScript
    script?.onLoaded(() => {
      if (!hasPendingShutdown) return
      hasPendingShutdown = false
      hasShutDown = true
      script.proxy.Intercom('shutdown')
    })
  }

  // Intercom cannot be revived with update once shut down, so a logout followed
  // by a re-login in the same session has to boot the messenger again. Boots off
  // intercomSettings, which the caller has already filled with the app id.
  function updateUser(settings: Record<string, unknown>): void {
    hasPendingShutdown = false
    if (!hasShutDown) {
      intercomScript?.proxy.Intercom('update', settings)
      return
    }
    hasShutDown = false
    intercomScript?.proxy.Intercom('boot', { ...window.intercomSettings })
  }

  return { show, showNewMessage, trackEvent, shutdown, updateUser }
}
