import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import type { App } from 'firebase-admin/app'
import type { Firestore } from 'firebase-admin/firestore'

let app: App | undefined
let db: Firestore | undefined

function initializeFirebase() {
  if (getApps().length === 0) {
    app = initializeApp()
  }
  else {
    app = getApps()[0]
  }

  if (!app) {
    throw createError({ statusMessage: 'Failed to initialize Firebase app' })
  }

  db = getFirestore(app)
  return db
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    return initializeFirebase()
  }
  return db
}

export function getUserCollection() {
  const firestore = getFirestoreDb()
  return firestore.collection('book-users')
}
