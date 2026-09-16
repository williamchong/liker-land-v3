// pdfjs-dist ships no types for its worker bundle. app/workers/pdf-worker.ts
// loads it for its side effects; app/utils/pdfjs.ts reads WorkerMessageHandler
// off it to hand pdf.js a fake worker when the real one fails to start.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  export const WorkerMessageHandler: unknown
}
