import { useStorage } from '@vueuse/core'

type LocaleCode = 'en' | 'zh-Hant'

function getDefaultLocaleFromCountry(country: string | null): LocaleCode {
  switch (country) {
    case 'HK':
    case 'TW':
    case 'CN':
    case 'MO':
    case 'SG':
    case 'MY':
      return 'zh-Hant'
    default:
      return 'en'
  }
}

export function useAutoLocale() {
  const i18n = useI18n()
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()

  const storedLocale = useStorage<LocaleCode | null>('user_locale', null)

  const detectedLocale = computed(() => getDefaultLocaleFromCountry(detectedCountry.value))

  const effectiveLocale = computed(() => {
    if (storedLocale.value) {
      return storedLocale.value
    }
    return detectedLocale.value
  })

  function setLocale(locale: LocaleCode) {
    storedLocale.value = locale
    i18n.setLocale(locale)
  }

  function initializeLocale() {
    if (!detectedCountry.value) {
      initializeClientGeolocation()
    }
    setLocale(effectiveLocale.value)
  }

  return {
    locale: i18n.locale,
    locales: i18n.locales,
    detectedLocale: readonly(detectedLocale),
    setLocale,
    initializeLocale,
  }
}
