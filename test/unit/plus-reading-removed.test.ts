import { describe, expect, it } from 'vitest'

import { getIsPlusReadingRemoved } from '~~/shared/utils/bookstore'

function createBookstoreInfo(isPlusReadingEnabled?: boolean) {
  return { isPlusReadingEnabled } as BookstoreInfo
}

describe('getIsPlusReadingRemoved', () => {
  it('reads a listing without Plus reading as removed', () => {
    expect(getIsPlusReadingRemoved(createBookstoreInfo(false))).toBe(true)
    // Indexer-sourced listings omit the flag; that still means out of the library.
    expect(getIsPlusReadingRemoved(createBookstoreInfo())).toBe(true)
  })

  it('never reads a Plus reading listing as removed', () => {
    expect(getIsPlusReadingRemoved(createBookstoreInfo(true))).toBe(false)
  })

  it('never reads a missing listing as removed', () => {
    expect(getIsPlusReadingRemoved(undefined)).toBe(false)
    expect(getIsPlusReadingRemoved(null)).toBe(false)
  })
})
