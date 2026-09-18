/**
 * Whether a request that came back with this status is worth trying again:
 * anything but a 4xx, plus the two 4xx that only mean "ask later".
 */
export function getIsRetryableHTTPStatus(status: number): boolean {
  return status < 400 || status >= 500 || status === 408 || status === 429
}

/**
 * The same, for a thrown error. One carrying no status (a network failure, a
 * timeout) is retryable: only a 4xx says the next attempt will fail too.
 */
export function getIsRetryableHTTPError(error: unknown): boolean {
  const status = (error as { status?: number, statusCode?: number })?.status
    ?? (error as { statusCode?: number })?.statusCode
  return typeof status !== 'number' || getIsRetryableHTTPStatus(status)
}
