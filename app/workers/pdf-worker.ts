// A worker is a separate realm, so app/plugins/polyfill.ts never reaches it.
// pdf.js calls toHex worker-side only, which is why the shim has to live here.
//
// Two static imports rather than an awaited dynamic one. Modules evaluate in
// import order, so the shim is installed before pdf.js reads toHex, and the
// worker's script still finishes synchronously — a top-level await defers the
// message handler past pdf.js's first handshake message and hangs every load.
import './install-to-hex'
import 'pdfjs-dist/build/pdf.worker.min.mjs'
