import type { Timestamp } from 'firebase-admin/firestore'

export interface BookSettingsFirestoreData extends BaseBookSettingsData {
  updatedAt?: Timestamp
  totalReadingTimeMs?: number
  totalTTSTimeMs?: number
  ttsCharactersUsed?: number
  completedAt?: Timestamp | null
  sessionCount?: number
}
