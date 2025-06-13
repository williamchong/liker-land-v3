interface EventParams {
  [key: string]: unknown
}

export default function useLogEvent(eventName: string, eventParams: EventParams = {}) {
  try {
    useTrackEvent(eventName, eventParams)
  }
  catch {
    console.error(`Failed to track event: ${eventName}`, eventParams)
  }

  const { proxy } = useScriptMetaPixel()
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
      proxy.fbq('track', eventNameMapping[eventName], {
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

  const { instance: crisp } = useScriptCrisp()
  if (crisp) {
    try {
      const { items, ...params } = eventParams
      if (items) {
        params.items = JSON.stringify(items)
      }
      crisp.set('session:event', [[[eventName, params]]])
    }
    catch (error) {
      console.error(`Failed to log event to Crisp: ${eventName}`, error)
    }
  }
}
