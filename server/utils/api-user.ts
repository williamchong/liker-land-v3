import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { BookSettingsData as ClientBookSettingsData } from '~/types/book-settings'

export interface UserDocData {
  ttsCharactersUsed?: number
  ttsLastUsed?: typeof FieldValue.serverTimestamp
  registerTimestamp?: typeof FieldValue.serverTimestamp
  loginTimestamp?: typeof FieldValue.serverTimestamp
  accessTimestamp?: typeof FieldValue.serverTimestamp
  loginMethod?: string
}

interface BookSettingsFirestoreData {
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
  'updatedAt'?: Timestamp
}

export async function getUserDoc(
  userWallet: string,
): Promise<UserDocData | undefined> {
  const userDocRef = await getUserCollection().doc(userWallet).get()
  return userDocRef.data()
}

export async function updateUserTTSCharacterUsage(
  userWallet: string,
  charactersUsed: number,
): Promise<void> {
  const userDocRef = getUserCollection().doc(userWallet)
  await userDocRef.set({
    ttsCharactersUsed: FieldValue.increment(charactersUsed),
    ttsLastUsed: FieldValue.serverTimestamp(),
  }, { merge: true })
}

export async function getBookSettings(
  userWallet: string,
  nftClassId: string,
): Promise<ClientBookSettingsData | undefined> {
  const bookDocRef = await getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())
    .get()

  const data = bookDocRef.data() as BookSettingsFirestoreData | undefined
  if (!data) return undefined

  return {
    ...data,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined,
  } as ClientBookSettingsData
}

export async function updateBookSettings(
  userWallet: string,
  nftClassId: string,
  settings: Partial<ClientBookSettingsData>,
): Promise<void> {
  const bookDocRef = getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())

  const { updatedAt, ...restSettings } = settings

  await bookDocRef.set({
    ...restSettings,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}
