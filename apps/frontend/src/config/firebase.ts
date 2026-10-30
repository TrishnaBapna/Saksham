/**
 * Firebase SDK v10 modular initialisation.
 * Uses environment variables — never hard-codes credentials.
 *
 * Import granularly from here rather than directly from firebase/* to keep
 * tree-shaking effective and ensure a single app instance.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { env } from './env';

// ─── Singleton initialisation ─────────────────────────────────────────────────

let _app: FirebaseApp;
let _auth: Auth;
let _db: Firestore;
let _storage: FirebaseStorage;

function getApp(): FirebaseApp {
  if (_app) return _app;
  // Guard: don't initialise twice (Vite HMR can re-run modules)
  if (getApps().length > 0) {
    _app = getApps()[0]!;
    return _app;
  }
  _app = initializeApp(env.firebase);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getApp());
  // Persist session across page reloads
  setPersistence(_auth, browserLocalPersistence).catch(console.warn);
  return _auth;
}

export function getFirestoreDb(): Firestore {
  if (_db) return _db;
  _db = initializeFirestore(getApp(), {
    // Modern cache API — replaces deprecated enableMultiTabIndexedDbPersistence
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getApp());
  return _storage;
}

// Re-export the app for cases that need it
export { getApp as getFirebaseApp };
