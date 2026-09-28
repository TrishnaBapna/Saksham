// Firebase configuration & client initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyACmlxg7M-00Q7FQl_6ss6Vdal-XUtsT9c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "saksham-2b5f0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "saksham-2b5f0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "saksham-2b5f0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "863700387333",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:863700387333:web:670b0f6a02719d51d73e6c"
};

// Initialize Firebase once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, firebaseConfig };
