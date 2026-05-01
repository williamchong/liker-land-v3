import type { Timestamp } from 'firebase-admin/firestore'
import type { ServerTimestampField } from '~/shared/types/book-settings'

export interface BookSettingsFirestoreData extends Omit<BaseBookSettingsData, ServerTimestampField> {
  updatedAt?: Timestamp
  totalReadingTimeMs?: number
  totalTTSListeningTimeMs?: number
  ttsCharactersUsed?: number
  lastOpenedTime?: Timestamp
  completedAt?: Timestamp | null
  didNotFinishAt?: Timestamp | null
  archivedAt?: Timestamp | null
  sessionCount?: number
}
