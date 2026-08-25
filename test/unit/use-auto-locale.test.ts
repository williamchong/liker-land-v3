import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { LocaleCode } from '~~/shared/types/user-settings'
import { getGuestEntryLocale } from '~/composables/use-auto-locale'

type UseAutoLocale = typeof import('~/composables/use-auto-locale').useAutoLocale

const {
  mockDetectedCountry,
  mockHasLoggedIn,
  mockRegister,
  mockRoute,
  mockRouteBaseName,
  mockSetLocale,
  mockSyncedLocale,
} = vi.hoisted(() => ({
  mockDetectedCountry: { value: null as string | null },
  mockHasLoggedIn: { value: false },
  mockRegister: vi.fn(),
  mockRoute: { path: '/', query: {} as Record<string, string> },
  mockRouteBaseName: { value: '' },
  mockSetLocale: vi.fn(),
  mockSyncedLocale: { value: null as LocaleCode | null },
}))

mockNuxtImport('useI18n', () => () => ({
  locale: ref('zh-Hant'),
  locales: ref([{ code: 'en' }, { code: 'zh-Hant' }]),
  setLocale: mockSetLocale,
}))
mockNuxtImport('useRoute', () => () => mockRoute)
mockNuxtImport('useUserSession', () => () => ({ loggedIn: mockHasLoggedIn }))
mockNuxtImport('useUserSettingsStore', () => () => ({
  ensureInitialized: vi.fn(),
}))
mockNuxtImport('useSyncedUserSettings', () => () => mockSyncedLocale)
mockNuxtImport('useDetectedGeolocation', () => () => ({
  detectedCountry: mockDetectedCountry,
  initializeClientGeolocation: vi.fn(),
}))
mockNuxtImport('useRouteBaseNameString', () => () => () => mockRouteBaseName.value)
mockNuxtImport('useScriptPostHog', () => () => ({
  onLoaded: (callback: (ctx: { posthog: { register: typeof mockRegister } }) => void) =>
    callback({ posthog: { register: mockRegister } }),
}))

function getRegisteredLocaleSource() {
  return mockRegister.mock.calls.at(-1)?.[0]?.locale_source
}

describe('getGuestEntryLocale', () => {
  it('holds the site default on a Chinese-copy entry route', () => {
    expect(getGuestEntryLocale('member', 'en')).toBe('zh-Hant')
  })

  it('leaves every other route on the detected locale', () => {
    expect(getGuestEntryLocale('store', 'en')).toBe('en')
    expect(getGuestEntryLocale('', 'en')).toBe('en')
  })
})

describe('useAutoLocale', () => {
  let useAutoLocale: UseAutoLocale

  beforeEach(async () => {
    localStorage.clear()
    mockRegister.mockClear()
    mockSetLocale.mockClear()
    mockDetectedCountry.value = 'US'
    mockHasLoggedIn.value = false
    mockRoute.path = '/'
    mockRoute.query = {}
    mockRouteBaseName.value = 'store'
    mockSyncedLocale.value = null
    // The localStorage ref is module-scoped and shared, so re-evaluate the module
    // to hand each test a fresh one reading the storage cleared above.
    vi.resetModules()
    ;({ useAutoLocale } = await import('~/composables/use-auto-locale'))
  })

  it('applies the account locale over the environment-detected one after logging in', async () => {
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()
    expect(mockSetLocale.mock.calls).toEqual([['en']])

    // Login is in-page, so app.vue re-runs this once the account settings land
    mockHasLoggedIn.value = true
    mockSyncedLocale.value = 'zh-Hant'
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['en'], ['zh-Hant']])
  })

  it('never writes the detected locale back to the account', async () => {
    mockHasLoggedIn.value = true
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['en']])
    expect(mockSyncedLocale.value).toBeNull()
  })

  it('does not persist the campaign locale override to the account', async () => {
    mockHasLoggedIn.value = true
    mockRoute.query = { utm_campaign: 'summer' }
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['zh-Hant']])
    expect(mockSyncedLocale.value).toBeNull()
  })

  it('leaves an explicit locale prefix in the URL alone', async () => {
    mockRoute.path = '/en/about'
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale).not.toHaveBeenCalled()
    expect(getRegisteredLocaleSource()).toBe('url')
  })

  it('persists an explicit locale choice to the account', () => {
    mockHasLoggedIn.value = true
    const { setLocale } = useAutoLocale()
    setLocale('en')

    expect(mockSyncedLocale.value).toBe('en')
    expect(mockSetLocale.mock.calls).toEqual([['en']])
  })

  it('keeps an explicit locale choice out of the account while logged out', () => {
    const { setLocale } = useAutoLocale()
    setLocale('en')

    expect(mockSyncedLocale.value).toBeNull()
    expect(mockSetLocale.mock.calls).toEqual([['en']])
  })

  it('gives a guest landing on /member the site default without persisting it', async () => {
    mockRouteBaseName.value = 'member'
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['zh-Hant']])
    expect(getRegisteredLocaleSource()).toBe('entry-route')
    expect(localStorage.getItem('user_locale')).toBeNull()
  })

  it('leaves a guest landing elsewhere on the detected locale, unpersisted', async () => {
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['en']])
    expect(getRegisteredLocaleSource()).toBe('geo')
    expect(localStorage.getItem('user_locale')).toBeNull()
  })

  it('reports geo, not the entry route, when both agree', async () => {
    mockRouteBaseName.value = 'member'
    mockDetectedCountry.value = 'HK'
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['zh-Hant']])
    expect(getRegisteredLocaleSource()).toBe('geo')
  })

  it('lets a stored choice outrank the entry route', async () => {
    mockRouteBaseName.value = 'member'
    const { initializeLocale, setLocale } = useAutoLocale()
    setLocale('en')
    mockSetLocale.mockClear()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['en']])
    expect(getRegisteredLocaleSource()).toBe('stored')
  })

  it('applies a user-initiated switch exactly once', async () => {
    mockHasLoggedIn.value = true
    const { initializeLocale, setLocale } = useAutoLocale()
    await initializeLocale()
    mockSetLocale.mockClear()

    setLocale('zh-Hant')

    expect(mockSetLocale.mock.calls).toEqual([['zh-Hant']])
  })
})
