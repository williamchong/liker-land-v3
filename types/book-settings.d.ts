export interface BookSettingsData extends BaseBookSettingsData {
  updatedAt?: number
}

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
