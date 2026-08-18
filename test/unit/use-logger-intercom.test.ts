import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setIntercomScript, useIntercom } from '~/composables/use-intercom'
import { useLogEvent } from '~/composables/use-logger'

// Only the script stubs need hoisting — mockNuxtImport factories run first.
const { mockGtag, mockFbq, mockCapture } = vi.hoisted(() => ({
  mockGtag: vi.fn(),
  mockFbq: vi.fn(),
  mockCapture: vi.fn(),
}))

mockNuxtImport('useScriptGoogleAnalytics', () => () => ({ proxy: { gtag: mockGtag } }))
mockNuxtImport('useScriptMetaPixel', () => () => ({ proxy: { fbq: mockFbq } }))
mockNuxtImport('useScriptPostHog', () => () => ({ proxy: { posthog: { capture: mockCapture } } }))

const mockNativePostMessage = vi.fn()
let mockIntercom = vi.fn()

// Stands in for the Nuxt Scripts instance: `.proxy` is reassigned from the
// recording proxy to a forwarding one on load, and onLoaded queues callbacks
// until then, invoking them straight away once the widget is up.
function registerScript() {
  mockIntercom = vi.fn()
  const pendingCallbacks: Array<() => void> = []
  let isLoaded = false
  const script = {
    proxy: { Intercom: mockIntercom },
    onLoaded(callback: () => void) {
      if (isLoaded) callback()
      else pendingCallbacks.push(callback)
    },
    load() {
      isLoaded = true
      pendingCallbacks.splice(0).forEach(callback => callback())
    },
  }
  setIntercomScript(script as unknown as Parameters<typeof setIntercomScript>[0])
  return script
}

function enableNativeBridge() {
  window.ReactNativeWebView = { postMessage: mockNativePostMessage }
  window.__nativeBridge = { features: ['intercom'] }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Clear the module-level shutdown state before a script is attached, so the
  // reset itself emits nothing and a shutdown cannot leak into the next test.
  setIntercomScript(undefined)
  useIntercom().updateUser({})
  registerScript()
  window.intercomSettings = { app_id: 'test-app' }
})

afterEach(() => {
  delete window.ReactNativeWebView
  delete window.__nativeBridge
})

describe('useIntercom trackEvent', () => {
  it('forwards through the script proxy before the widget has loaded', () => {
    useIntercom().trackEvent('sign_up', { method: 'magic' })

    expect(mockIntercom).toHaveBeenCalledWith('trackEvent', 'sign_up', { method: 'magic' })
  })

  // The proxy swap on load is why the script is held rather than its proxy:
  // a captured proxy keeps recording into a stack that is never replayed again.
  it('follows the proxy swap the widget performs on load', () => {
    const script = registerScript()
    const loadedIntercom = vi.fn()
    script.proxy = { Intercom: loadedIntercom }

    useIntercom().trackEvent('tts_start', { book: 'abc' })

    expect(loadedIntercom).toHaveBeenCalledWith('trackEvent', 'tts_start', { book: 'abc' })
    expect(mockIntercom).not.toHaveBeenCalled()
  })

  it('prefers the native bridge and leaves the web proxy untouched', () => {
    enableNativeBridge()

    useIntercom().trackEvent('sign_up', { method: 'magic' })

    expect(mockNativePostMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: 'intercomTrackEvent', name: 'sign_up', metaData: { method: 'magic' } }),
    )
    expect(mockIntercom).not.toHaveBeenCalled()
  })

  it('no-ops when no script was registered', () => {
    setIntercomScript(undefined)

    expect(() => useIntercom().trackEvent('sign_up')).not.toThrow()
    expect(mockIntercom).not.toHaveBeenCalled()
  })
})

describe('useIntercom shutdown', () => {
  it('ends the session when the widget is already up', () => {
    const script = registerScript()
    script.load()

    useIntercom().shutdown()

    expect(mockIntercom).toHaveBeenCalledWith('shutdown')
  })

  it('waits for the widget when the logout beats the load', () => {
    const script = registerScript()

    useIntercom().shutdown()
    expect(mockIntercom).not.toHaveBeenCalled()

    script.load()
    expect(mockIntercom).toHaveBeenCalledWith('shutdown')
  })

  // A blindly queued shutdown would replay after the re-login boots the
  // messenger and kill it, which is worse than the stale session it clears.
  it('drops the pending shutdown when the reader logs back in first', () => {
    const script = registerScript()

    useIntercom().shutdown()
    useIntercom().updateUser({ user_id: 'liker1' })
    script.load()

    expect(mockIntercom).not.toHaveBeenCalledWith('shutdown')
  })

  // update cannot revive a shut down messenger, so a re-login has to boot it.
  it('boots again when the reader logs back in after the shutdown ran', () => {
    const script = registerScript()
    script.load()
    useIntercom().shutdown()

    useIntercom().updateUser({ user_id: 'liker1' })

    expect(mockIntercom).toHaveBeenCalledWith('boot', { app_id: 'test-app' })
    expect(mockIntercom).not.toHaveBeenCalledWith('update', { user_id: 'liker1' })
  })

  it('updates in place when the messenger was never shut down', () => {
    const script = registerScript()
    script.load()

    useIntercom().updateUser({ user_id: 'liker1' })

    expect(mockIntercom).toHaveBeenCalledWith('update', { user_id: 'liker1' })
  })
})

describe('useLogEvent Intercom forwarding', () => {
  it('forwards an allowlisted event fired before the widget loads', () => {
    useLogEvent('login_panel_open', { method: 'magic' })

    expect(mockIntercom).toHaveBeenCalledWith('trackEvent', 'login_panel_open', { method: 'magic' })
  })

  it('stringifies items, which Intercom cannot store as an array', () => {
    useLogEvent('view_item', { items: [{ id: '0xabc-1' }] })

    expect(mockIntercom).toHaveBeenCalledWith('trackEvent', 'view_item', {
      items: JSON.stringify([{ id: '0xabc-1' }]),
    })
  })

  it('skips events outside the allowlist', () => {
    useLogEvent('about_cta_sign_up_click')

    expect(mockIntercom).not.toHaveBeenCalled()
    expect(mockCapture).toHaveBeenCalled()
  })
})
