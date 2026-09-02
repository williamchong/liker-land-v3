import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref, type Ref } from 'vue'

type UseRegion = typeof import('~/composables/use-region').useRegion
type UseBookRegionGate = typeof import('~/composables/use-region').useBookRegionGate

// Filled in beforeEach: vi.hoisted runs before the vue import initializes, so the
// refs cannot be built here — only the holder the mock factory closes over.
const geo = vi.hoisted(() => ({
  ipCountry: undefined as unknown as Ref<string | null>,
  localeCountry: undefined as unknown as Ref<string | null>,
}))

// Mirrors the real composable, whose detectedCountry prefers the cf-ipcountry
// header and only falls back to the browser locale with no header to trust.
mockNuxtImport('useDetectedGeolocation', () => () => ({
  detectedCountry: computed(() => geo.ipCountry.value || geo.localeCountry.value),
  initializeServerGeolocation: vi.fn(),
  initializeClientGeolocation: vi.fn(),
}))

function resetGeolocation() {
  geo.ipCountry = ref<string | null>(null)
  geo.localeCountry = ref<string | null>(null)
}

describe('useRegion', () => {
  let useRegion: UseRegion

  beforeEach(async () => {
    resetGeolocation()
    vi.resetModules()
    ;({ useRegion } = await import('~/composables/use-region'))
  })

  it('stays undefined until geolocation resolves, so the UI can hold a placeholder', () => {
    expect(useRegion().region.value).toBeUndefined()
  })

  it('follows the IP country', () => {
    const { region } = useRegion()
    geo.ipCountry.value = 'TW'

    expect(region.value).toBe('TW')
  })

  it('re-derives when the IP country changes, so a later load follows the reader', () => {
    const { region } = useRegion()
    geo.ipCountry.value = 'TW'
    geo.ipCountry.value = 'JP'

    expect(region.value).toBe('JP')
  })

  it('falls back to the browser locale with no IP country', () => {
    const { region } = useRegion()
    geo.localeCountry.value = 'JP'

    expect(region.value).toBe('JP')
  })

  it('falls back to the default region when the detected value is not a country code', () => {
    // 'T1' is cf-ipcountry's Tor code; 'HANT' comes from a zh-Hant-HK style value
    const { region } = useRegion()

    geo.ipCountry.value = 'T1'
    expect(region.value).toBe('HK')

    geo.ipCountry.value = null
    geo.localeCountry.value = 'HANT'
    expect(region.value).toBe('HK')
  })
})

describe('useBookRegionGate', () => {
  let useBookRegionGate: UseBookRegionGate

  beforeEach(async () => {
    resetGeolocation()
    vi.resetModules()
    ;({ useBookRegionGate } = await import('~/composables/use-region'))
  })

  it('restricts on the IP country', () => {
    geo.ipCountry.value = 'HK'
    const { getIsRegionRestricted } = useBookRegionGate()

    expect(getIsRegionRestricted(['HK'])).toBe(true)
    expect(getIsRegionRestricted(['JP'])).toBe(false)
  })

  it('restricts on the locale fallback, which must not open a withheld market', () => {
    geo.localeCountry.value = 'TW'
    const { getIsRegionRestricted } = useBookRegionGate()

    expect(getIsRegionRestricted(['TW'])).toBe(true)
    expect(getIsRegionRestricted(['HK'])).toBe(false)
  })

  it('restricts on the default region when nothing parses', () => {
    geo.ipCountry.value = 'T1'
    const { getIsRegionRestricted } = useBookRegionGate()

    expect(getIsRegionRestricted(['HK'])).toBe(true)
  })

  it('never restricts before geolocation resolves', () => {
    const { getIsRegionRestricted } = useBookRegionGate()

    expect(getIsRegionRestricted(['HK'])).toBe(false)
  })
})
