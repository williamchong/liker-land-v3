import type { LocaleCode } from '~/composables/use-auto-locale'
import type { PaymentCurrency } from '~/composables/use-payment-currency'

export interface BaseUserSettingsData {
  locale?: LocaleCode | null
  currency?: PaymentCurrency
}
