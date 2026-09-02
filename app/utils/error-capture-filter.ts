import { parseURL } from 'ufo'

// `capture_exceptions: { capture_console_errors: true }` (nuxt.config) turns
// every console.error into an $exception, including diagnostics third-party
// libraries write from inside their own try/catch.

// Wallet session state lives in IndexedDB; the browser tears the connection
// down on unload or WebView suspension, which is normal, not a failed connect.
export const WALLET_CONNECT_IDB_TEARDOWN = 'The database connection is closing'

// posthog-js synthesizes this when console.error gets a plain object instead of
// an Error. WalletConnect's pino logger does exactly that.
export const OBJECT_CAPTURED_MARKER = 'captured as exception with keys'

// WalletConnect session proposals carry a ~5 minute TTL. Walking away from the
// QR modal rejects the proposal, which is an abandoned login, not a failure.
export const WALLET_CONNECT_PROPOSAL_EXPIRED = 'Proposal expired'

// epub-ts logs this from inside its own try/catch while measuring a Range. The
// DOM offset sits in the message text, so every offset groups as a new issue.
export const EPUB_RANGE_LOG_PREFIX = 'setting end offset to start container length failed'
const EPUB_RANGE_OFFSET_PATTERN = /(There is no child at offset )\d+/

// The native shell pushes this to the WebView when its stall watchdog gives up.
const PLAYBACK_STUCK_MESSAGE = 'Playback stuck'

// A grouping identity, deliberately not the matched text: rewording the native
// message must not also move the key that holds the issue together.
const PLAYBACK_STUCK_FINGERPRINT = 'native_playback_stuck'

// The five spellings one media load failure reached us under, kept for clients
// still on a cached bundle: our MediaError wrapper, Chromium's demuxer text,
// the pipeline message, the play() rejection and the stall watchdog.
const MEDIA_FAILURE_MARKERS = [
  'MEDIA_ERR_',
  'MEDIA_ELEMENT_ERROR',
  'NotSupportedError: Failed to load',
  'STUCK_TIMEOUT',
]

// Matched whole: NotSupportedError is a general DOM error, and only the audio
// element raised it here.
const MEDIA_FAILURE_EXACT = 'NotSupportedError'

const MEDIA_FAILURE_FINGERPRINT = 'media_playback_failure'

// ofetch bakes the request URL and the response status into the message it
// throws, so one route forks per query string, per browser wording (WebKit says
// "Load failed", Chromium "Failed to fetch") and per call-site stack.
const OFETCH_REQUEST_PATTERN = /\[(\w+)\] "([^"]+)": (?:(\d{3})|<no response>)/

// Wallet and NFT class addresses sit in the path on the LikeCoin API, so
// dropping the query string alone still forks the path per book. Global because
// one path carries two; only ever used with .replace(), which resets lastIndex.
const ADDRESS_SEGMENT_PATTERN = /\/0x[0-9a-f]+(?=\/|$)/gi

export interface CapturedException {
  value?: string
  mechanism?: { synthetic?: boolean }
}

export function getIsIgnoredCapturedException(exception: CapturedException) {
  const value = exception.value || ''
  if (value.includes(WALLET_CONNECT_IDB_TEARDOWN)) return true
  if (value.includes(WALLET_CONNECT_PROPOSAL_EXPIRED)) return true
  // Only the synthetic ones: posthog sets that when the thrown value carried no
  // stack of its own, which is the logger-object case. A message-less object we
  // throw ourselves is a real bug and reports synthetic: false. Verified against
  // 14 days of production events — the split is exact.
  if (value.includes(OBJECT_CAPTURED_MARKER)) return exception.mechanism?.synthetic === true
  return false
}

// Returns the message unchanged unless it is the epub-ts Range log, whose
// trailing DOM offset is what splits one log across a dozen issues.
export function normalizeCapturedExceptionMessage(message: string) {
  if (!message.includes(EPUB_RANGE_LOG_PREFIX)) return message
  return message.replace(EPUB_RANGE_OFFSET_PATTERN, '$1<offset>')
}

// PostHog fingerprints on the stack when there is one, so an error whose frames
// depend on where it escaped forks a new issue per deploy. Undefined leaves
// PostHog's own fingerprint in place.
export function getStableExceptionFingerprint(exceptions: Array<CapturedException>) {
  // Separate passes on purpose: a stall, then a media failure, each anywhere in
  // the list, outranks a fetch failure earlier in it.
  if (exceptions.some(exception => exception.value?.includes(PLAYBACK_STUCK_MESSAGE))) {
    return PLAYBACK_STUCK_FINGERPRINT
  }
  if (exceptions.some(exception => getIsMediaFailureValue(exception.value))) {
    return MEDIA_FAILURE_FINGERPRINT
  }
  for (const exception of exceptions) {
    const fingerprint = getOfetchRequestFingerprint(exception.value)
    if (fingerprint) return fingerprint
  }
  return undefined
}

function getIsMediaFailureValue(value = '') {
  if (value === MEDIA_FAILURE_EXACT) return true
  return MEDIA_FAILURE_MARKERS.some(marker => value.includes(marker))
}

// Unanchored so a request wrapped in one of our own thrown errors still groups
// by the request that failed. A 401 and a 500 on one route are different bugs,
// so the status stays in the key.
function getOfetchRequestFingerprint(value = '') {
  // Every ofetch message opens `[METHOD] "url"`, so skip the scan otherwise.
  if (!value.includes('] "')) return undefined
  const match = value.match(OFETCH_REQUEST_PATTERN)
  if (!match) return undefined
  const [, method = '', url = '', status = 'no_response'] = match
  const { host = '', pathname } = parseURL(url)
  const path = pathname.replace(ADDRESS_SEGMENT_PATTERN, '/<address>')
  return `fetch_${method.toLowerCase()}_${host}${path}_${status}`
}

export function getIsLocalhostHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}
