import pdfWorkerURL from '../workers/pdf-worker?worker&url'

// workerSrc is global to pdf.js, so every caller loads it through here and gets
// our wrapper bundle, which runs the toHex shim in the worker realm. Use a
// workerSrc, not a workerPort: only a worker pdf.js made falls back to no worker.
export async function loadPDFJS() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerURL
  return pdfjs
}
