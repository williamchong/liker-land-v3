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
  const currency = useStorage<PaymentCurrency>('payment_currency', 'auto')

  const detectedCurrency = computed(() => getDefaultCurrencyFromCountry(detectedCountry.value))

  function setCurrency(value: PaymentCurrency) {
    currency.value = value
  }

  function getDisplayCurrency(): PricingCurrency {
    if (currency.value === 'auto') {
      return detectedCurrency.value
    }
    return currency.value as PricingCurrency
  }

  function getCheckoutCurrency(): string | undefined {
    const curr = currency.value
    if (curr === 'auto') {
      return undefined
    }
    return curr.toLowerCase()
  }

  return {
    currency: readonly(currency),
    detectedCountry: readonly(detectedCountry),
    detectedCurrency: readonly(detectedCurrency),
    setCurrency,
    getDisplayCurrency,
    getCheckoutCurrency,
  }
}
