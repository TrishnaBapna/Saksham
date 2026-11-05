import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCF8e0mz_gEW-_mepL8ujtAgQfIOIIeLkc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'saksham-d3b71.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'saksham-d3b71',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'saksham-d3b71.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1084220897195',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1084220897195:web:65467d2231e064766504ee',
};

// Singleton initialization with graceful fallback
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  !import.meta.env.VITE_FIREBASE_API_KEY.includes('placeholder')
);

export default app;
