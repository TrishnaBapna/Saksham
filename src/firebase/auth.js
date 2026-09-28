// Firebase Authentication Helpers
import { auth } from './config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { createUserProfile, getUserProfile } from './db';

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  let profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    profile = await createUserProfile(cred.user.uid, {
      name: cred.user.displayName || email.split('@')[0],
      email: cred.user.email
    });
  }
  return { user: cred.user, profile };
}

export async function registerWithEmail(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  const profile = await createUserProfile(cred.user.uid, {
    name: name || email.split('@')[0],
    email: cred.user.email
  });
  return { user: cred.user, profile };
}

export async function logoutUser() {
  await signOut(auth);
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      callback({ firebaseUser, profile });
    } else {
      callback({ firebaseUser: null, profile: null });
    }
  });
}
