import { useStorage } from '@vueuse/core'

export type LocaleCode = 'en' | 'zh-Hant'

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
  const userSettingsStore = useUserSettingsStore()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()

  const syncedLocale = useSyncedUserSettings<LocaleCode | null>({
    key: 'locale',
    defaultValue: null,
  })

  const localStorageLocale = useStorage<LocaleCode | null>('user_locale', null)

  const detectedLocale = computed(() => getDefaultLocaleFromCountry(detectedCountry.value))

  function setLocale(locale: LocaleCode) {
    if (hasLoggedIn.value) {
      syncedLocale.value = locale
    }
    localStorageLocale.value = locale
    i18n.setLocale(locale)
  }

  async function initializeLocale() {
    if (!detectedCountry.value) {
      initializeClientGeolocation()
    }

    if (hasLoggedIn.value) {
      await userSettingsStore.ensureInitialized()
    }

    setLocale(syncedLocale.value || localStorageLocale.value || detectedLocale.value)
  }

  return {
    locale: i18n.locale,
    locales: i18n.locales,
    detectedLocale: readonly(detectedLocale),
    setLocale,
    initializeLocale,
  }
}
