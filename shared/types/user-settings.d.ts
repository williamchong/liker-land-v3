import type { LocaleCode } from '~/composables/use-auto-locale'

export type PaymentCurrency = 'auto' | 'hkd' | 'twd' | 'usd'

export interface BaseUserSettingsData {
  locale?: LocaleCode | null
  currency?: PaymentCurrency
}

export type UserSettingKey = 'locale' | 'currency'
