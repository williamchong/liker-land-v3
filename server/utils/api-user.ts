import { FieldValue } from 'firebase-admin/firestore'

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
