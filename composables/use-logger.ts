import { setUser as setSentryUser } from '@sentry/nuxt'
import { sha256 } from 'viem'
import type { User } from '#auth-utils'

interface EventParams {
  [key: string]: unknown
}

export function useLogEvent(eventName: string, eventParams: EventParams = {}) {
  try {
    useTrackEvent(eventName, eventParams)
    const googleAdConversionId = useRuntimeConfig().public.googleAdConversionId
    if (googleAdConversionId && eventName === 'purchase') {
      const { gtag } = useGtag()
      gtag('event', 'conversion', {
        send_to: googleAdConversionId,
        ...eventParams,
      })
    }
  }
  catch {
    console.error(`Failed to track event: ${eventName}`, eventParams)
  }

  const { proxy: fbq } = useScriptMetaPixel()
  try {
    const eventNameMapping: { [key: string]: string } = {
      view_item: 'ViewContent',
      begin_checkout: 'InitiateCheckout',
      add_to_cart: 'AddToCart',
      purchase: 'Purchase',
      search: 'Search',
    }
    if (eventNameMapping[eventName]) {
      const {
        transaction_id: paymentId,
        value,
        currency,
        items,
      } = eventParams
      const eventId = paymentId ? `${eventName}_${paymentId}` : undefined
      fbq.fbq('track', eventNameMapping[eventName], {
        currency,
        value,
        order_id: paymentId,
        content_type: items ? 'product' : undefined,
        contents: Array.isArray(items)
          ? items.map(i => ({
              id: i.id,
              quantity: i.quantity || 1,
            }))
          : undefined,
        content_ids: Array.isArray(items) ? items.map(i => i.id) : undefined,
      }, { eventID: eventId })
    }
  }
  catch {
    console.error(`Failed to track event with Meta Pixel: ${eventName}`, eventParams)
  }

  if (window?.Intercom) {
    try {
      const { items, ...params } = eventParams
      if (items) {
        params.items = JSON.stringify(items)
      }
      window.Intercom('trackEvent', eventName, params)
    }
    catch (error) {
      console.error(`Failed to log event to Intercom: ${eventName}`, error)
    }
  }

  const { proxy: hotjar } = useScriptHotjar()
  try {
    hotjar.hj('event', eventName)
  }
  catch (error) {
    console.error(`Failed to log event to Hotjar: ${eventName}`, error)
  }
}

export function useSetLogUser(user: User | null) {
  // Set user in Sentry
  if (!user) {
    setSentryUser(null)
  }
  else {
    setSentryUser({
      id: user?.evmWallet,
      email: user?.email,
      username: user?.displayName || user?.evmWallet || user?.likeWallet,
    })
  }

  // Set user ID in Google Analytics
  const { gtag } = useGtag()
  try {
    if (!user) {
      gtag('set', {
        user_id: null,
      })
    }
    else {
      gtag('set', {
        user_id: sha256(user.evmWallet as `0x${string}`),
        user_data: { email: user.email || undefined },
      })
    }
  }
  catch (error) {
    console.error('Failed to set user ID in Google Analytics', error)
  }

  // Set user info in Intercom
  if (window?.Intercom) {
    try {
      const intercom = window.Intercom
      if (!user) {
        intercom('shutdown')
        return
      }
      else {
        intercom('update', {
          user_id: user.likerId,
          email: user.email,
          name: user.displayName || user.evmWallet || user.likeWallet,
          avatar: user.avatar
            ? {
                type: 'avatar',
                image_url: user.avatar,
              }
            : undefined,
          evm_wallet: user.evmWallet,
          like_wallet: user.likeWallet,
          login_method: user.loginMethod,
          is_liker_plus: user.isLikerPlus,
        })
      }
    }
    catch (error) {
      console.error('Failed to set user data in Intercom', error)
    }
  }

  const { proxy: hotjar } = useScriptHotjar()
  if (user) {
    try {
      hotjar.hj('identify', user.evmWallet || user.likeWallet, {
        email: user.email,
        name: user.displayName || user.evmWallet || user.likeWallet,
        evm_wallet: user.evmWallet,
        login_method: user.loginMethod,
      })
    }
    catch (error) {
      console.error('Failed to set user data in Hotjar', error)
    }
  }
}
