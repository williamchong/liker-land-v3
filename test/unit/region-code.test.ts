import { describe, expect, it } from 'vitest'
import { parseRegionCode } from '~~/shared/utils/region'

// The server ledger path keeps the parsed value or nothing at all, so the sentinels
// cf-ipcountry can emit must not survive the parse and become a region total.
describe('parseRegionCode', () => {
  it('accepts an ISO-3166-1 code, case-insensitively', () => {
    expect(parseRegionCode('HK')).toBe('HK')
    expect(parseRegionCode('tw')).toBe('TW')
  })

  it('drops cf-ipcountry sentinels', () => {
    expect(parseRegionCode('XX')).toBeUndefined()
    expect(parseRegionCode('T1')).toBeUndefined()
  })

  it('drops a locale fragment and an empty value', () => {
    expect(parseRegionCode('HANT')).toBeUndefined()
    expect(parseRegionCode('')).toBeUndefined()
    expect(parseRegionCode(null)).toBeUndefined()
    expect(parseRegionCode(undefined)).toBeUndefined()
  })
})
