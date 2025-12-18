import { useStorage } from '@vueuse/core'

type LocaleCode = 'en' | 'zh-Hant'

function getDefaultLocaleFromCountry(country: string): LocaleCode {
  switch (country) {
    case 'HK':
    case 'TW':
    case 'CN':
    case 'MO':
    case 'SG':
      return 'zh-Hant'
    default:
      return 'en'
  }
}

export function useAutoLocale() {
  const i18n = useI18n()
  const { detectedCountry } = useGeolocation()

  const storedLocale = useStorage<LocaleCode | null>('user_locale', null)

  const effectiveLocale = computed(() => {
    if (storedLocale.value) {
      return storedLocale.value
    }
    return getDefaultLocaleFromCountry(detectedCountry.value)
  })

  function setLocale(locale: LocaleCode) {
    storedLocale.value = locale
    i18n.setLocale(locale)
  }

  onMounted(() => {
    // SSR cannot get useStorage, get it on mounted hook
    setLocale(effectiveLocale.value)
  })

  return {
    locale: i18n.locale,
    locales: i18n.locales,
    detectedLocale: computed(() => getDefaultLocaleFromCountry(detectedCountry.value)),
    setLocale,
  }
}
