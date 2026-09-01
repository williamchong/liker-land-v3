import { installUint8ArrayToHex } from '../utils/uint8-array-to-hex'

// A worker is a separate realm, so app/plugins/polyfill.ts never reaches it.
// pdf.js calls toHex worker-side only, which is why the shim has to live here.
installUint8ArrayToHex()

// Dynamic on purpose: a static import is hoisted above the call above, and the
// worker bundle would read the missing method before the shim installs it.
await import('pdfjs-dist/build/pdf.worker.min.mjs')
