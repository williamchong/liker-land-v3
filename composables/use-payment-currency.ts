import { useStorage } from '@vueuse/core'
import type { PricingCurrency } from '~/utils/pricing'

export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'

function getDefaultCurrencyFromCountry(country: string | null): PricingCurrency {
  switch (country) {
    case 'HK':
      return 'hkd'
    case 'TW':
      return 'twd'
    default:
      return 'usd'
  }
}

export function usePaymentCurrency() {
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()
  const currency = useState<PaymentCurrency>('payment-currency', () => 'auto')
  const storedCurrency = useStorage<PaymentCurrency>('payment_currency', 'auto')

  const detectedCurrency = computed(() => getDefaultCurrencyFromCountry(detectedCountry.value))

  function setCurrency(value: PaymentCurrency) {
    currency.value = value
    storedCurrency.value = value
  }

  const displayCurrency = computed<PricingCurrency>(() => {
    if (currency.value === 'auto') {
      return detectedCurrency.value
    }
    return currency.value as PricingCurrency
  })

  function getCheckoutCurrency(): string | undefined {
    const curr = currency.value
    if (curr === 'auto') {
      return undefined
    }
    return curr.toLowerCase()
  }

  function initializePaymentCurrency() {
    if (!detectedCountry.value) {
      initializeClientGeolocation()
    }
    setCurrency(storedCurrency.value)
  }

  return {
    currency: readonly(currency),
    detectedCurrency: readonly(detectedCurrency),
    displayCurrency: readonly(displayCurrency),
    setCurrency,
    getCheckoutCurrency,
    initializePaymentCurrency,
  }
}
