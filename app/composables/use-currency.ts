import { convertUSDPriceToCurrency, type PricingCurrency } from '~/utils/pricing'

const CURRENCY_PREFIXES: Record<PricingCurrency, string> = {
  hkd: 'HK$',
  twd: 'NT$',
  usd: 'US$',
}

export default function () {
  const { t: $t } = useI18n()
  const { displayCurrency } = usePaymentCurrency()

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

  // A per-book override (minor units, e.g. cents) takes precedence over the
  // index-based ladder conversion. USD always uses the ladder/stored price.
  function resolvePrice(
    usdPrice: number,
    priceInDecimalByCurrency?: BookPriceInDecimalByCurrency,
  ): number {
    const currency = displayCurrency.value
    if (currency !== 'usd') {
      const override = priceInDecimalByCurrency?.[currency]
      if (typeof override === 'number' && override > 0) {
        return override / 100
      }
    }
    return convertUSDPriceToCurrency(usdPrice, currency)
  }

  function formatPrice(price: number, priceInDecimalByCurrency?: BookPriceInDecimalByCurrency) {
    return formatCurrencyAmount(resolvePrice(price, priceInDecimalByCurrency), displayCurrency.value)
  }

  function formatDiscountedPrice(
    usdPrice: number,
    discountRate: number,
    priceInDecimalByCurrency?: BookPriceInDecimalByCurrency,
  ): string {
    const discountedPrice = resolvePrice(usdPrice, priceInDecimalByCurrency) * (1 - discountRate)
    return formatCurrencyAmount(discountedPrice, displayCurrency.value)
  }

  function convertPrice(
    usdPrice: number,
    priceInDecimalByCurrency?: BookPriceInDecimalByCurrency,
  ): number {
    return resolvePrice(usdPrice, priceInDecimalByCurrency)
  }

  // Formats an amount already expressed in the display currency (e.g. a sum of
  // per-line-item resolved prices), without re-applying ladder conversion.
  function formatConvertedPrice(amount: number): string {
    return formatCurrencyAmount(amount, displayCurrency.value)
  }

  return {
    formatPrice,
    formatDiscountedPrice,
    convertPrice,
    formatConvertedPrice,
  }
}
