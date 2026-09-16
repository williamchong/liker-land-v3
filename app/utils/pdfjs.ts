import pdfWorkerURL from '../workers/pdf-worker?worker&url'

let fakeWorkerMessageHandler: Promise<unknown> | undefined

// pdf.js's no-worker fallback reads WorkerMessageHandler off workerSrc, but Vite
// builds workers with preserveEntrySignatures: false, so our wrapper exports none.
// A plain dynamic import keeps it, and staying lazy keeps it off the happy path.
function installFakeWorkerFallback(pdfWorker: { _setupFakeWorkerGlobal?: unknown }) {
  if (!('_setupFakeWorkerGlobal' in pdfWorker)) return
  Object.defineProperty(pdfWorker, '_setupFakeWorkerGlobal', {
    get: () => (fakeWorkerMessageHandler ??= import('pdfjs-dist/build/pdf.worker.min.mjs')
      .then(({ WorkerMessageHandler }) => WorkerMessageHandler)
      // pdf.js latches every later worker onto this fallback, so caching a
      // rejection would strand the reader on one flaky fetch until a reload.
      .catch((error) => {
        fakeWorkerMessageHandler = undefined
        throw error
      })),
    configurable: true,
  })
}

// workerSrc is global to pdf.js, so every caller loads it through here and gets
// our wrapper bundle, which runs the polyfills in the worker realm. Use a
// workerSrc, not a workerPort: only a worker pdf.js made falls back to no worker.
export async function loadPDFJS() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerURL
  installFakeWorkerFallback(pdfjs.PDFWorker)
  return pdfjs
}
