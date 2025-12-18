import { useStorage } from '@vueuse/core'

export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'

export function usePaymentCurrency() {
  const currency = useStorage<PaymentCurrency>('payment_currency', 'auto')

  function setCurrency(value: PaymentCurrency) {
    currency.value = value
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
    setCurrency,
    getCheckoutCurrency,
  }
}
