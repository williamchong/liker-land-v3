import { COUNTRY_CODES } from '~~/shared/constants/country-codes'
import type { RegionCode } from '~~/shared/types/user-settings'

const COUNTRY_CODE_SET = new Set<string>(COUNTRY_CODES)

// cf-ipcountry is not always a country: it also emits sentinels ('XX' unknown,
// 'T1' Tor). Anything outside ISO-3166-1 is dropped rather than defaulted, so a
// sentinel never lands in a region-keyed total.
export function parseRegionCode(value: string | null | undefined): RegionCode | undefined {
  if (!value) return undefined
  const code = value.toUpperCase()
  return COUNTRY_CODE_SET.has(code) ? code : undefined
}
