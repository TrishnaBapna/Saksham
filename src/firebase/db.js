// Cloud Firestore Database Operations
// Conforms strictly to schema:
// users/{userId} (name, email, createdAt, faceEnabled, passkeyEnabled)
// users/{userId}/faceProfile/{profileId} (protectedEmbedding, createdAt, updatedAt)
// users/{userId}/passkeys/{credentialId} (credentialId, publicKey, signCount, createdAt)

import { db } from './config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';

/**
 * Fetch a user profile by Firebase UID
 */
export async function getUserProfile(userId) {
  if (!userId) return null;
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Create or sync initial user document
 */
export async function createUserProfile(userId, { name, email }) {
  if (!userId) throw new Error('User ID is required');
  const userRef = doc(db, 'users', userId);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    const payload = {
      name: name || (email ? email.split('@')[0] : 'User'),
      email: email || '',
      createdAt: serverTimestamp(),
      faceEnabled: false,
      passkeyEnabled: false
    };
    await setDoc(userRef, payload);
    return { id: userId, ...payload };
  }
  return { id: userId, ...existing.data() };
}

/**
 * Update user profile flags
 */
export async function updateUserProfile(userId, updates) {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Save enrolled WebAuthn passkey into users/{userId}/passkeys/{credentialId}
 * Note: Never contains raw biometric data. Only public key and credential metadata.
 */
export async function savePasskey(userId, { credentialId, publicKey, signCount = 0 }) {
  if (!userId || !credentialId) throw new Error('Missing passkey parameters');
  const passkeyRef = doc(db, 'users', userId, 'passkeys', credentialId);
  const payload = {
    credentialId,
    publicKey,
    signCount,
    createdAt: serverTimestamp()
  };
  await setDoc(passkeyRef, payload);

  // Set passkeyEnabled flag on user document
  await updateUserProfile(userId, { passkeyEnabled: true });
  return payload;
}

/**
 * Retrieve all registered passkeys for a user
 */
export async function getPasskeys(userId) {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'passkeys');
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Save protected face representation into users/{userId}/faceProfile/{profileId}
 * Note: Never raw video frames. Only irreversibly protected mathematical embedding.
 */
export async function saveFaceProfile(userId, protectedEmbedding, profileId = 'primary') {
  if (!userId || !protectedEmbedding) throw new Error('Missing face profile parameters');
  const faceRef = doc(db, 'users', userId, 'faceProfile', profileId);
  const now = serverTimestamp();
  
  await setDoc(faceRef, {
    protectedEmbedding,
    createdAt: now,
    updatedAt: now
  });

  // Set faceEnabled flag on user document
  await updateUserProfile(userId, { faceEnabled: true });
}

/**
 * Retrieve primary face profile representation
 */
export async function getFaceProfile(userId, profileId = 'primary') {
  if (!userId) return null;
  const faceRef = doc(db, 'users', userId, 'faceProfile', profileId);
  const snap = await getDoc(faceRef);
  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * Delete My Face Data: Completely deletes all face embeddings and clears faceEnabled flag
 */
export async function deleteFaceProfile(userId, profileId = 'primary') {
  if (!userId) return;
  const faceRef = doc(db, 'users', userId, 'faceProfile', profileId);
  await deleteDoc(faceRef);
  await updateUserProfile(userId, { faceEnabled: false });
}

/**
 * Lookup a user by email to retrieve their public biometrics flags (faceEnabled, passkeyEnabled)
 * for initializing Passkey / Face recognition before session start.
 */
export async function findUserByEmail(email) {
  if (!email) return null;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.trim().toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}
