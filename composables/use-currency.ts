import { convertUSDPriceToCurrency, type PricingCurrency } from '~/utils/pricing'

const CURRENCY_PREFIXES: Record<PricingCurrency, string> = {
  hkd: 'HK$',
  twd: 'NT$',
  usd: 'US$',
}

export default function () {
  const { t: $t } = useI18n()
  const { getDisplayCurrency } = usePaymentCurrency()

  function getCurrencyPrefix(currency: PricingCurrency) {
    return CURRENCY_PREFIXES[currency] ?? 'US$'
  }

  function getFractionDigits(currency: PricingCurrency): number {
    return currency === 'usd' ? 2 : 0
  }

  function formatCurrencyAmount(amount: number, displayCurrency: PricingCurrency): string {
    if (amount <= 0) {
      return $t('price_free')
    }

    const prefix = getCurrencyPrefix(displayCurrency)
    const fractionDigits = getFractionDigits(displayCurrency)

    return `${prefix}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount)}`
  }

  function formatPrice(price: number) {
    const displayCurrency = getDisplayCurrency()
    const convertedPrice = convertUSDPriceToCurrency(price, displayCurrency)
    return formatCurrencyAmount(convertedPrice, displayCurrency)
  }

  function formatDiscountedPrice(usdPrice: number, discountRate: number): string {
    const displayCurrency = getDisplayCurrency()
    const convertedPrice = convertUSDPriceToCurrency(usdPrice, displayCurrency)
    const discountedPrice = convertedPrice * (1 - discountRate)
    return formatCurrencyAmount(discountedPrice, displayCurrency)
  }

  function convertPrice(usdPrice: number): number {
    const displayCurrency = getDisplayCurrency()
    return convertUSDPriceToCurrency(usdPrice, displayCurrency)
  }

  return {
    formatPrice,
    formatDiscountedPrice,
    convertPrice,
    getDisplayCurrency,
  }
}
