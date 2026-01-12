import type { BaseUserSettingsData } from '~/shared/types/user-settings'

export interface UserSettingsData extends BaseUserSettingsData {
  updatedAt?: number
}

export type UserSettingKey = 'locale' | 'currency'
