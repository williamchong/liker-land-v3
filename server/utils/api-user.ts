import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { BookSettingsData } from '~/types/book-settings'
import type { BookSettingsFirestoreData } from '~/server/types/book-settings'

export interface UserDocData {
  ttsCharactersUsed?: number
  ttsLastUsed?: typeof FieldValue.serverTimestamp
  registerTimestamp?: typeof FieldValue.serverTimestamp
  loginTimestamp?: typeof FieldValue.serverTimestamp
  accessTimestamp?: typeof FieldValue.serverTimestamp
  loginMethod?: string
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
): Promise<BookSettingsData | undefined> {
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
  } as BookSettingsData
}

export async function updateBookSettings(
  userWallet: string,
  nftClassId: string,
  settings: Partial<BookSettingsData>,
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

const BATCH_SIZE_LIMIT = 30

export async function getBatchBookSettings(
  userWallet: string,
  nftClassIds: string[],
): Promise<Record<string, BookSettingsData>> {
  if (nftClassIds.length === 0) {
    return {}
  }

  const result: Record<string, BookSettingsData> = {}

  // Firestore 'in' operator supports up to 30 values, so we need to chunk
  for (let i = 0; i < nftClassIds.length; i += BATCH_SIZE_LIMIT) {
    const chunk = nftClassIds.slice(i, i + BATCH_SIZE_LIMIT)
    const snapshot = await getUserCollection()
      .doc(userWallet)
      .collection('books')
      .where(
        FieldPath.documentId(),
        'in',
        chunk.map(id => id.toLowerCase()),
      )
      .get()

    snapshot.forEach((doc) => {
      const data = doc.data() as BookSettingsFirestoreData
      result[doc.id] = {
        ...data,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined,
      } as BookSettingsData
    })
  }

  return result
}
