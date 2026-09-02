import { describe, expect, it } from 'vitest'
import {
  getIsIgnoredCapturedException,
  getIsLocalhostHostname,
  getStableExceptionFingerprint,
  normalizeCapturedExceptionMessage,
} from '~/utils/error-capture-filter'

describe('getIsIgnoredCapturedException', () => {
  it('drops WalletConnect IndexedDB teardown', () => {
    expect(getIsIgnoredCapturedException({
      value: 'Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.',
      mechanism: { synthetic: false },
    })).toBe(true)
  })

  it('drops an expired WalletConnect session proposal', () => {
    expect(getIsIgnoredCapturedException({
      value: 'Error: Proposal expired',
      mechanism: { synthetic: false },
    })).toBe(true)
  })

  // The four shapes WalletConnect's pino logger produced in production; all
  // reported synthetic: true, none carried a message worth triaging.
  it.each([
    'Object captured as exception with keys: level, time',
    'Object captured as exception with keys: context, level, msg, time',
    'Object captured as exception with keys: level, msg, time',
    'Object captured as exception with keys: context, level, time',
  ])('drops synthetic object-captured exception: %s', (value) => {
    expect(getIsIgnoredCapturedException({ value, mechanism: { synthetic: true } })).toBe(true)
  })

  it('keeps a non-synthetic object-captured exception', () => {
    // The EMAIL_ALREADY_USED shape thrown by our own code — a real bug.
    expect(getIsIgnoredCapturedException({
      value: 'Object captured as exception with keys: data, statusCode',
      mechanism: { synthetic: false },
    })).toBe(false)
  })

  it('keeps an object-captured exception with no mechanism reported', () => {
    expect(getIsIgnoredCapturedException({
      value: 'Object captured as exception with keys: data, statusCode',
    })).toBe(false)
  })

  it('matches the marker when posthog prefixes a class name', () => {
    expect(getIsIgnoredCapturedException({
      value: '\'Foo\' captured as exception with keys: level, time',
      mechanism: { synthetic: true },
    })).toBe(true)
  })

  it('keeps ordinary application errors', () => {
    expect(getIsIgnoredCapturedException({
      value: 'TypeError: Cannot read properties of undefined (reading \'packaging\')',
      mechanism: { synthetic: false },
    })).toBe(false)
  })
})

describe('normalizeCapturedExceptionMessage', () => {
  it('collapses epub-ts Range logs that differ only by DOM offset', () => {
    const build = (offset: number) =>
      `setting end offset to start container length failed IndexSizeError: Failed to execute 'setEnd' on 'Range': There is no child at offset ${offset}.`
    const normalized = [2, 3, 117].map(o => normalizeCapturedExceptionMessage(build(o)))
    expect(new Set(normalized).size).toBe(1)
    expect(normalized[0]).toContain('There is no child at offset <offset>.')
  })

  it('leaves unrelated messages untouched', () => {
    const message = 'TypeError: Failed to fetch'
    expect(normalizeCapturedExceptionMessage(message)).toBe(message)
  })
})

describe('getStableExceptionFingerprint', () => {
  // Production reported the same stall both bare and Error-prefixed; the stacks
  // differed, so only the value can group them.
  it('gives both reported shapes of the native stall one fingerprint', () => {
    const bare = getStableExceptionFingerprint([{ value: 'Playback stuck' }])
    expect(bare).toBeTruthy()
    expect(getStableExceptionFingerprint([{ value: 'Error: Playback stuck' }])).toBe(bare)
  })

  it('reads past a leading exception in the list', () => {
    expect(getStableExceptionFingerprint([
      { value: 'TypeError: Failed to fetch' },
      { value: 'Playback stuck' },
    ])).toBeTruthy()
  })

  it.each([
    { value: 'TypeError: Cannot read properties of undefined' },
    {},
  ])('leaves unrelated exceptions on PostHog\'s own fingerprint: %s', (exception) => {
    expect(getStableExceptionFingerprint([exception])).toBeUndefined()
  })

  it('handles an empty exception list', () => {
    expect(getStableExceptionFingerprint([])).toBeUndefined()
  })

  // The three production issues for one query-less route: WebKit and Chromium
  // word the drop differently, and the same wording forked again on the stack.
  it('gives one route one fingerprint across browser wording and stack', () => {
    const fingerprints = [
      '[GET] "/api/store/for-you": <no response> Load failed',
      '[GET] "/api/store/for-you": <no response> Failed to fetch',
      '[GET] "/api/store/for-you": <no response> Fetch is aborted',
    ].map(value => getStableExceptionFingerprint([{ value }]))
    expect(new Set(fingerprints).size).toBe(1)
    expect(fingerprints[0]).toBeTruthy()
  })

  it('collapses a route whose query string carries the NFT class id', () => {
    const build = (nftClassId: string) =>
      `[GET] "/api/book-list?nft_class_id=${nftClassId}&price_index=0": <no response> Load failed`
    expect(getStableExceptionFingerprint([{ value: build('0x0cbf57dab1e90953d6d8fd0d195199d774627e4a') }]))
      .toBe(getStableExceptionFingerprint([{ value: build('0x5c5623cc312dcd36ca869444e91b95ff5238f1b0') }]))
  })

  it('collapses an address that sits in the path', () => {
    const build = (nftClassId: string) =>
      `[GET] "https://api.like.co/likernft/book/purchase/${nftClassId}/messages": 502 `
    expect(getStableExceptionFingerprint([{ value: build('0x28e3c71f7e244508562b5ec0c0f1a980156ff582') }]))
      .toBe(getStableExceptionFingerprint([{ value: build('0xb1cc4739a501f74635e66b8199d54e0418b98ef3') }]))
  })

  // The rest of these compare keys to each other, so they would also pass a key
  // that dropped the route. Pin the shape once.
  it.each([
    ['[GET] "https://api.like.co/likernft/book/purchase/0x28e3c71f7e244508562b5ec0c0f1a980156ff582/messages": 502 ', 'fetch_get_api.like.co/likernft/book/purchase/<address>/messages_502'],
    ['[GET] "/api/store/search?q=%E5%A4%A7&limit=100": <no response> Failed to fetch', 'fetch_get_/api/store/search_no_response'],
  ])('builds the fingerprint from method, host, path and status: %s', (value, expected) => {
    expect(getStableExceptionFingerprint([{ value }])).toBe(expected)
  })

  it('groups a request wrapped in one of our own thrown errors', () => {
    const request = '[GET] "https://api.like.co/likernft/book/purchase/0x28e3c71f7e244508562b5ec0c0f1a980156ff582/messages": 502 '
    const wrapped = `Failed to fetch messages for NFT class 0x28e3c71f7e244508562b5ec0c0f1a980156ff582: FetchError: ${request}`
    const bare = request
    expect(getStableExceptionFingerprint([{ value: wrapped }]))
      .toBe(getStableExceptionFingerprint([{ value: bare }]))
  })

  // A 401 and a dropped connection on one route are different bugs.
  it('keeps statuses apart on the same route', () => {
    const route = '[GET] "/api/book-list?nft_class_id=0x0cbf57dab1e90953d6d8fd0d195199d774627e4a&price_index=0"'
    const noResponse = getStableExceptionFingerprint([{ value: `${route}: <no response> Load failed` }])
    const unauthorized = getStableExceptionFingerprint([{ value: `${route}: 401 ` }])
    expect(noResponse).toBeTruthy()
    expect(unauthorized).toBeTruthy()
    expect(noResponse).not.toBe(unauthorized)
  })

  it('keeps methods apart on the same route', () => {
    expect(getStableExceptionFingerprint([{ value: '[GET] "/api/register": <no response> Load failed' }]))
      .not.toBe(getStableExceptionFingerprint([{ value: '[POST] "/api/register": <no response> Load failed' }]))
  })

  it('leaves the native stall on its own fingerprint when both are present', () => {
    expect(getStableExceptionFingerprint([
      { value: '[GET] "/api/store/for-you": <no response> Load failed' },
      { value: 'Playback stuck' },
    ])).toBe(getStableExceptionFingerprint([{ value: 'Playback stuck' }]))
  })
})

describe('getIsLocalhostHostname', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('treats %s as local', (hostname) => {
    expect(getIsLocalhostHostname(hostname)).toBe(true)
  })

  it('treats the production host as remote', () => {
    expect(getIsLocalhostHostname('3ook.com')).toBe(false)
  })
})
