import type { PDFDisplayStage } from '~~/shared/constants/analytics'

// What the reader knew at the moment it stopped painting. The canvas size and
// pixel ratio ride along because a blank page and an oversized canvas the
// browser silently dropped are indistinguishable from the error alone.
export interface PDFDisplayFailure {
  stage: PDFDisplayStage
  error: unknown
  pageNumber?: number
  scale?: number
  pixelRatio?: number
  canvasWidth?: number
  canvasHeight?: number
}
