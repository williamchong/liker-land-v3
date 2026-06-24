const MAGIC_OTP_HINT_ELEMENT_ID = 'MagicOTPHint'

// Matches the z-index Magic gives its iframe, so the hint shares the top layer
// and DOM order (not z-index) decides which wins — see keepOnTop below.
const MAGIC_OVERLAY_MAX_Z_INDEX = '2147483647'

// Only one hint exists at a time; track its observer so a re-show can tear the
// previous one down instead of leaking it.
let activeObserver: MutationObserver | undefined

// Magic renders its email-OTP screen in a full-viewport iframe we can't reach
// into, so this pins a non-interactive hint above it that reads as a note below
// the OTP card. Returns a cleanup function.
export function showMagicOTPHint(message: string): () => void {
  if (!import.meta.client) return () => {}

  // Disconnect a still-running observer first; otherwise its keepOnTop would
  // re-append the node we're about to remove.
  activeObserver?.disconnect()
  document.getElementById(MAGIC_OTP_HINT_ELEMENT_ID)?.remove()

  const hint = document.createElement('div')
  hint.id = MAGIC_OTP_HINT_ELEMENT_ID
  hint.textContent = message
  Object.assign(hint.style, {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
    transform: 'translateX(-50%)',
    zIndex: MAGIC_OVERLAY_MAX_Z_INDEX,
    maxWidth: 'min(420px, calc(100vw - 32px))',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'rgba(0, 0, 0, 0.72)',
    color: '#ffffff',
    font: '500 13px/1.5 system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    pointerEvents: 'none',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.24)',
  })
  document.body.appendChild(hint)

  // The Magic iframe shares our max z-index, so DOM order decides stacking.
  // Keep the hint as body's last child so it stays above the iframe, even when
  // Magic lazily appends the iframe after us on the first login of a session.
  const keepOnTop = () => {
    if (document.body.lastElementChild !== hint) {
      document.body.appendChild(hint)
    }
  }
  const observer = new MutationObserver(keepOnTop)
  activeObserver = observer
  observer.observe(document.body, { childList: true })

  return () => {
    observer.disconnect()
    if (activeObserver === observer) activeObserver = undefined
    hint.remove()
  }
}
