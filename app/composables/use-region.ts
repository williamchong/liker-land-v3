import { COUNTRIES } from '~~/shared/constants/countries'
import { COUNTRY_CODES } from '~~/shared/constants/country-codes'
import type { RegionCode } from '~~/shared/types/user-settings'

const DEFAULT_REGION: RegionCode = 'HK'

const COUNTRY_CODE_SET = new Set<string>(COUNTRY_CODES)

export function parseRegionCode(value: string | null | undefined): RegionCode | undefined {
  if (!value) return undefined
  const code = value.toUpperCase()
  return COUNTRY_CODE_SET.has(code) ? code : undefined
}

// Detected, never chosen: the region follows cf-ipcountry, which only reaches the
// server render, then the browser locale, then HK. Derived rather than resolved
// once, so it stays `undefined` until geolocation lands and the UI can show a
// placeholder instead of a country the reader may not be in.
export function useRegion() {
  const { detectedCountry } = useDetectedGeolocation()

  const region = computed<RegionCode | undefined>(() => {
    if (!detectedCountry.value) return undefined
    return parseRegionCode(detectedCountry.value) || DEFAULT_REGION
  })

  return { region }
}

// Compliance geo gate. One country to check: the region already is the IP country
// whenever cf-ipcountry parsed, and falls back to a stricter guess when it did not.
export function useBookRegionGate() {
  const { region } = useRegion()

  function getIsRegionRestricted(restrictedTerritories: string[] | undefined): boolean {
    return getIsBookRegionRestricted(restrictedTerritories, region.value)
  }

  return { getIsRegionRestricted }
}

export function useRegionLabel() {
  const { locale } = useI18n()
  const { region } = useRegion()

  const regionLabel = computed(() => {
    const country = region.value && COUNTRIES.find(({ code }) => code === region.value)
    if (!country) return '-'
    return country.name[locale.value] ?? country.name.en
  })

  return { regionLabel }
}
