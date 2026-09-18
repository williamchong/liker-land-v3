import { describe, expect, it } from 'vitest'
import { getIsRetryableHTTPError, getIsRetryableHTTPStatus } from '~~/shared/utils/http-status'

describe('getIsRetryableHTTPStatus', () => {
  it('gives up on an ordinary 4xx', () => {
    [400, 401, 403, 404, 422].forEach(status => expect(getIsRetryableHTTPStatus(status)).toBe(false))
  })

  it('retries the two 4xx that only mean "ask later"', () => {
    expect(getIsRetryableHTTPStatus(408)).toBe(true)
    expect(getIsRetryableHTTPStatus(429)).toBe(true)
  })

  it('retries a 5xx', () => {
    [500, 502, 503, 504].forEach(status => expect(getIsRetryableHTTPStatus(status)).toBe(true))
  })
})

describe('getIsRetryableHTTPError', () => {
  it('reads the status off `status`', () => {
    expect(getIsRetryableHTTPError({ status: 403 })).toBe(false)
    expect(getIsRetryableHTTPError({ status: 503 })).toBe(true)
  })

  it('falls back to `statusCode`, as ofetch errors carry it', () => {
    expect(getIsRetryableHTTPError({ statusCode: 401 })).toBe(false)
    expect(getIsRetryableHTTPError({ statusCode: 429 })).toBe(true)
  })

  it('retries an error with no status, such as a network failure or timeout', () => {
    expect(getIsRetryableHTTPError(new TypeError('Failed to fetch'))).toBe(true)
    expect(getIsRetryableHTTPError(new DOMException('timed out', 'TimeoutError'))).toBe(true)
    expect(getIsRetryableHTTPError(undefined)).toBe(true)
    expect(getIsRetryableHTTPError({ status: '403' })).toBe(true)
  })
})
