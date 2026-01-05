export interface BookSettingsData {
  // EPUB settings (namespace: 'epub')
  'epub-cfi'?: string
  'epub-fontSize'?: number
  'epub-activeTTSElementIndex'?: number

  // PDF settings (namespace: 'pdf')
  'pdf-currentPage'?: number
  'pdf-scale'?: number
  'pdf-isDualPageMode'?: boolean
  'pdf-isRightToLeft'?: boolean

  // Common settings (no namespace)
  'progress'?: number
  'lastOpenedTime'?: number
  'updatedAt'?: number
}

// Unprefixed keys used as parameters (namespace gets added internally)
export type BookSettingKey =
  | 'cfi'
  | 'fontSize'
  | 'activeTTSElementIndex'
  | 'currentPage'
  | 'scale'
  | 'isDualPageMode'
  | 'isRightToLeft'
  | 'progress'
  | 'lastOpenedTime'
