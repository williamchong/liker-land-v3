export interface BaseBookSettingsData {
  'epub-cfi'?: string
  'epub-fontSize'?: number
  'epub-lineHeight'?: number
  'epub-writingMode'?: 'horizontal-tb' | 'vertical-rl'
  'epub-activeTTSElementIndex'?: number
  'pdf-currentPage'?: number
  'pdf-scale'?: number
  'pdf-isDualPageMode'?: boolean
  'pdf-isRightToLeft'?: boolean
  'progress'?: number
  'lastOpenedTime'?: number
  'completedAt'?: number | null
  'didNotFinishAt'?: number | null
  'archivedAt'?: number | null
}

export type ServerTimestampField = 'lastOpenedTime' | 'completedAt' | 'didNotFinishAt' | 'archivedAt'

export interface BookSettingsUpdatePayload extends Omit<Partial<BaseBookSettingsData>, ServerTimestampField> {
  lastOpenedTime?: true
  completedAt?: true | null
  didNotFinishAt?: true | null
  archivedAt?: true | null
}
