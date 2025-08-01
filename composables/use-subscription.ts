import { PaywallModal } from '#components'
import type { PaywallModalProps } from '~/components/PaywallModal.props'

export function useSubscription() {
  const likeCoinSessionAPI = useLikeCoinSessionAPI()
  const { t: $t } = useI18n()
  const accountStore = useAccountStore()
  const { user, loggedIn: hasLoggedIn } = useUserSession()
  const localeRoute = useLocaleRoute()
  const getRouteQuery = useRouteQuery()
  const toast = useToast()
  const { getAnalyticsParameters } = useAnalytics()

  const selectedPlan = ref<SubscriptionPlan>('yearly')
  const isProcessingSubscription = ref(false)

  const { handleError } = useErrorHandler()

  const modalProps = ref<PaywallModalProps>({})
  // TODO: Don't hardcode prices here
  const yearlyPrice = ref(69.99)
  const monthlyPrice = ref(6.99)
  const currency = ref('USD')
  const PLUS_DISCOUNT_PERCENTAGE = 0.2 // 20% discount
  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus
  })

  const eventPayload = computed(() => ({
    currency: currency.value,
    value: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
    items: [{
      id: `plus-beta-${selectedPlan.value}`,
      name: `Plus Beta (${selectedPlan.value})`,
      price: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
      currency: currency.value,
      quantity: 1,
    }],
  }))

  function getPaywallModalProps(): PaywallModalProps {
    return {
      'modelValue': selectedPlan.value,
      'discountedYearlyPrice': yearlyPrice.value,
      'discountedMonthlyPrice': monthlyPrice.value,
      'isProcessingSubscription': isProcessingSubscription.value,
      'onUpdate:modelValue': (value: SubscriptionPlan) => {
        selectedPlan.value = value
        useLogEvent('select_item', eventPayload.value)
      },
      'onOpen': () => {
        useLogEvent('view_item', eventPayload.value)
      },
      'onSubscribe': startSubscription,
    }
  }

  const overlay = useOverlay()
  const paywallModal = overlay.create(PaywallModal, {
    props: getPaywallModalProps(),
  })

  async function openPaywallModal(props: PaywallModalProps = {}) {
    if (paywallModal.isOpen) {
      paywallModal.close()
    }

    modalProps.value = {
      ...getPaywallModalProps(),
      ...props,
    }
    return paywallModal.open(modalProps.value).result
  }

  async function redirectIfSubscribed() {
    if (isLikerPlus.value) {
      await navigateTo(localeRoute({ name: 'account' }))
      return true
    }
    return false
  }

  async function startSubscription({
    hasFreeTrial = false,
    mustCollectPaymentMethod = true,
    utmCampaign,
    utmMedium,
    utmSource,
  }: {
    hasFreeTrial?: boolean
    mustCollectPaymentMethod?: boolean
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
  } = {}) {
    useLogEvent('add_to_cart', eventPayload.value)
    useLogEvent('subscription_button_click', { plan: selectedPlan.value })

    const isSubscribed = await redirectIfSubscribed()
    if (isSubscribed) return
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }

    if (isProcessingSubscription.value) return
    try {
      isProcessingSubscription.value = true

      if (!user.value?.likerId) {
        toast.add({
          title: $t ('pricing_page_liker_id_required'),
          description: $t('pricing_page_liker_id_required_description'),
          color: 'warning',
        })
        isProcessingSubscription.value = false
        return
      }
      useLogEvent('begin_checkout', eventPayload.value)

      const analyticsParams = getAnalyticsParameters()
      const { url } = await likeCoinSessionAPI.fetchLikerPlusCheckoutLink({
        period: selectedPlan.value,
        from: getRouteQuery('from'),
        hasFreeTrial,
        mustCollectPaymentMethod,
        ...analyticsParams,
        utmCampaign: utmCampaign || analyticsParams.utmCampaign,
        utmMedium: utmMedium || analyticsParams.utmMedium,
        utmSource: utmSource || analyticsParams.utmSource,
      })
      await navigateTo(url, { external: true })
    }
    catch (error) {
      handleError(error)
    }
    finally {
      isProcessingSubscription.value = false
    }
  }

  function getPlusDiscountPrice(price: number): number | null {
    if (isLikerPlus.value && price > 0) {
      return Math.round(price * (1 - PLUS_DISCOUNT_PERCENTAGE))
    }
    return null
  }

  watch(isProcessingSubscription, (newValue) => {
    paywallModal.patch({
      ...modalProps.value,
      isProcessingSubscription: newValue,
    })
  })

  return {
    yearlyPrice,
    monthlyPrice,
    currency,

    isLikerPlus,
    getPlusDiscountPrice,
    isProcessingSubscription,

    openPaywallModal,
    redirectIfSubscribed,
    startSubscription,
  }
}
