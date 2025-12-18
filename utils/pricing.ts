import { USD_PRICE_TIER_LIST, HKD_PRICE_TIER_LIST, TWD_PRICE_TIER_LIST } from '~/constants/pricing'

export type PricingCurrency = 'hkd' | 'twd' | 'usd'

export function convertUSDPriceToCurrency(price: number, currency: PricingCurrency): number {
  switch (currency) {
    case 'hkd': {
      const index = Math.min(Math.round(price), HKD_PRICE_TIER_LIST.length - 1)
      return HKD_PRICE_TIER_LIST[index] ?? 0
    }
    case 'twd': {
      const index = Math.min(Math.round(price), TWD_PRICE_TIER_LIST.length - 1)
      return TWD_PRICE_TIER_LIST[index] ?? 0
    }
    case 'usd':
    default:
      return price
  }
}

export function convertCurrencyToUSDPrice(price: number, currency: PricingCurrency): number {
  switch (currency) {
    case 'hkd': {
      const index = HKD_PRICE_TIER_LIST.findIndex(tierPrice => tierPrice >= price)
      const maxPrice = USD_PRICE_TIER_LIST[USD_PRICE_TIER_LIST.length - 1] ?? 100.99
      return index >= 0 ? (USD_PRICE_TIER_LIST[index] ?? maxPrice) : maxPrice
    }
    case 'twd': {
      const index = TWD_PRICE_TIER_LIST.findIndex(tierPrice => tierPrice >= price)
      const maxPrice = USD_PRICE_TIER_LIST[USD_PRICE_TIER_LIST.length - 1] ?? 100.99
      return index >= 0 ? (USD_PRICE_TIER_LIST[index] ?? maxPrice) : maxPrice
    }
    case 'usd':
    default:
      return price
  }
}
