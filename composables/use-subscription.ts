import { PLUS_BOOK_PURCHASE_DISCOUNT } from '~/constants/pricing'

export function useSubscription() {
  const { user, loggedIn: hasLoggedIn } = useUserSession()
  const { displayCurrency, getCheckoutCurrency } = usePaymentCurrency()

  const {
    monthlyPrice,
    yearlyPrice,
  } = useSubscriptionPricing()

  const currency = computed(() => displayCurrency.value.toUpperCase())

  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus
  })

  const likerPlusPeriod = computed(() => {
    if (!hasLoggedIn.value || !isLikerPlus.value) return undefined
    return user.value?.likerPlusPeriod || undefined
  })

  function getPlusDiscountPrice(price: number): number | null {
    if (isLikerPlus.value && price > 0) {
      return Math.round(price * (1 - PLUS_BOOK_PURCHASE_DISCOUNT) * 100) / 100
    }
    return null
  }

  function getPlusDiscountRate(): number {
    if (isLikerPlus.value) {
      return (1 - PLUS_BOOK_PURCHASE_DISCOUNT)
    }
    return 0
  }

  return {
    yearlyPrice,
    monthlyPrice,
    currency,

    isLikerPlus,
    likerPlusPeriod,
    hasLoggedIn,
    getPlusDiscountPrice,
    getPlusDiscountRate,
    getCheckoutCurrency,
    PLUS_BOOK_PURCHASE_DISCOUNT,
  }
}
