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

  if (import.meta.client) {
    watch(effectiveLocale, (newLocale) => {
      if (i18n.locale.value !== newLocale) {
        i18n.setLocale(newLocale)
      }
    }, { immediate: true })
  }

  function setLocale(locale: LocaleCode) {
    storedLocale.value = locale
    i18n.setLocale(locale)
  }

  return {
    locale: i18n.locale,
    locales: i18n.locales,
    detectedLocale: computed(() => getDefaultLocaleFromCountry(detectedCountry.value)),
    setLocale,
  }
}
