import { useStorage } from '@vueuse/core'
import type { PricingCurrency } from '~/utils/pricing'

export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'

function getDetectedCountry(): string {
  // Try to get country from Cloudflare IP Geolocation header
  if (import.meta.server) {
    const headers = useRequestHeaders()
    const country = headers['cf-ipcountry']?.toUpperCase()
    return country || 'US'
  }

  return 'US'
}

function getDefaultCurrencyFromCountry(country: string): PricingCurrency {
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
  const detectedCountry = useState<string>('detected-country', getDetectedCountry)
  const currency = useState<PaymentCurrency>('auto')
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

  function getDisplayCurrency(): PricingCurrency {
    return displayCurrency.value
  }

  function getCheckoutCurrency(): string | undefined {
    const curr = currency.value
    if (curr === 'auto') {
      return undefined
    }
    return curr.toLowerCase()
  }

  onMounted(() => {
    // SSR cannot get useStorage, get it on mounted hook
    setCurrency(storedCurrency.value)
  })
  return {
    currency: readonly(currency),
    detectedCountry: readonly(detectedCountry),
    detectedCurrency: readonly(detectedCurrency),
    displayCurrency: readonly(displayCurrency),
    setCurrency,
    getDisplayCurrency,
    getCheckoutCurrency,
  }
}
