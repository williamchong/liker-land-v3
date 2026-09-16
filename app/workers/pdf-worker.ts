import { installPolyfills } from '../utils/polyfills'
import 'pdfjs-dist/build/pdf.worker.min.mjs'

// A worker is a separate realm, so app/plugins/polyfill.ts never reaches it and
// pdf.js calls toHex and Promise.withResolvers worker-side only. Installed after
// the import but before any message is handled, which is when pdf.js reads them.
installPolyfills()
