// Not a global augmentation: TypeScript made Uint8Array generic over its buffer,
// so `interface Uint8Array` merges on some lib versions and not others.
export type Uint8ArrayWithToHex = Uint8Array & { toHex?: () => string }

// pdfjs-dist fingerprints every document through Uint8Array.prototype.toHex,
// which Chromium ships from 140 and WebKit from Safari 26. Below that
// getDocument() rejects with "a.toHex is not a function" and no page ever
// paints. pdfjs-dist is pinned to 5.4.624 for old-WebView support (see
// b1dc4ac9) and every 5.x release calls toHex, so shim it rather than upgrade.
export function installUint8ArrayToHex() {
  const proto = Uint8Array.prototype as Uint8ArrayWithToHex
  if (proto.toHex) return
  Object.defineProperty(proto, 'toHex', {
    value: function (this: Uint8Array): string {
      let hex = ''
      for (const byte of this) {
        hex += byte.toString(16).padStart(2, '0')
      }
      return hex
    },
    writable: true,
    configurable: true,
    enumerable: false,
  })
}
