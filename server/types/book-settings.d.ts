import type { Timestamp } from 'firebase-admin/firestore'

export interface BookSettingsFirestoreData extends BaseBookSettingsData {
  updatedAt?: Timestamp
}
