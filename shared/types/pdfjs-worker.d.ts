// pdfjs-dist ships no types for its worker bundle: it is a side-effect entry
// point, loaded only by app/workers/pdf-worker.ts.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs'
