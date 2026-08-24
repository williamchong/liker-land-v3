// A trapped dialog pulls focus back out of anything appended to `body`, which
// clears the selection before `execCommand` can read it. Stay in the scope that
// currently holds focus, falling back to `body` when it is going away.
function getFocusScopeHost() {
  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement) || activeElement === document.body) {
    return document.body
  }
  const host = activeElement.parentElement
  return host?.isConnected ? host : document.body
}

// Returns whether the write actually landed — VueUse's `useClipboard` reports
// success either way, which is the bug this exists to avoid.
export async function copyTextToClipboard(text: string): Promise<boolean> {
  // `navigator.clipboard` is secure-context only, so its presence is the gate.
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch (error) {
      console.warn('Clipboard API write failed, falling back to execCommand:', error)
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  // Pin it in the viewport: focusing a textarea sitting at the foot of the
  // document scrolls the page down to it. `readonly` keeps the iOS keyboard down.
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.opacity = '0'
  textarea.setAttribute('readonly', '')
  getFocusScopeHost().appendChild(textarea)
  try {
    // iOS treats `select()` on an unfocused element as a no-op.
    textarea.focus({ preventScroll: true })
    textarea.select()
    return document.execCommand('copy')
  }
  catch (error) {
    console.warn('execCommand copy failed:', error)
    return false
  }
  finally {
    textarea.remove()
  }
}
