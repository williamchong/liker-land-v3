export const usePlusCheckoutStore = defineStore('plus-checkout', () => {
  const clientSecret = ref<string | null>(null)
  const paymentId = ref<string | null>(null)
  const period = ref<SubscriptionPlan | null>(null)
  const tier = ref<LikerPlusTier | null>(null)
  const coupon = ref<string | null>(null)
  const isTrial = ref(false)

  function setSession(payload: {
    clientSecret: string
    paymentId: string
    period: SubscriptionPlan
    tier?: LikerPlusTier
    coupon?: string | null
    isTrial: boolean
  }) {
    clientSecret.value = payload.clientSecret
    paymentId.value = payload.paymentId
    period.value = payload.period
    tier.value = payload.tier ?? null
    coupon.value = payload.coupon ?? null
    isTrial.value = payload.isTrial
  }

  function clear() {
    clientSecret.value = null
    paymentId.value = null
    period.value = null
    tier.value = null
    coupon.value = null
    isTrial.value = false
  }

  return {
    clientSecret,
    paymentId,
    period,
    tier,
    coupon,
    isTrial,
    setSession,
    clear,
  }
})
