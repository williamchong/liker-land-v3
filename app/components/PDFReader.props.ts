import type { PDFDisplayStage } from '~~/shared/constants/analytics'

// Canvas the reader was painting when a render failed. WebKit drops an
// oversized canvas silently and resolves the render anyway, so the geometry is
// the only evidence that path leaves.
export interface PDFRenderAttempt {
  pageNumber: number
  pixelRatio: number
  canvasWidth: number
  canvasHeight: number
}

export interface PDFDisplayContext extends Partial<PDFRenderAttempt> {
  stage: PDFDisplayStage
  scale: number
  pageNumber: number
}
