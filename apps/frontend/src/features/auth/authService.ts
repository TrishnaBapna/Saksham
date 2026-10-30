/**
 * Firebase Auth service — all auth operations in one place.
 * Never import firebase/auth directly in components; use this module.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb } from '@/config/firebase';
import type { UserRole, CareCondition, UserProfile } from '@/types/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterPatientPayload {
  email: string;
  password: string;
  name: string;
}

export interface RegisterCaregiverPayload {
  email: string;
  password: string;
  name: string;
}

export interface RegisterDoctorPayload {
  email: string;
  password: string;
  name: string;
}

export interface AuthError {
  code: string;
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map Firebase error codes to human-readable messages */
export function humaniseAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/too-many-requests':       'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':  'Network error. Please check your connection.',
    'auth/user-disabled':           'This account has been disabled. Contact support.',
    'auth/requires-recent-login':   'Please sign in again to continue.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}

/** Write the initial user profile document to Firestore after registration */
async function createUserProfile(
  uid: string,
  role: UserRole,
  name: string,
  email: string
): Promise<void> {
  const db = getFirestoreDb();
  const profileRef = doc(db, 'users', uid);

  // Don't overwrite an existing profile (e.g. re-registration attempt)
  const snap = await getDoc(profileRef);
  if (snap.exists()) return;

  const profile: Omit<UserProfile, 'id'> = {
    uid,
    firebaseUid: uid,
    email,
    name,
    role,
    onboardingComplete: role !== 'patient', // patients go through onboarding
    emailVerified: false,
    createdAt: new Date().toISOString(),
  };

  await setDoc(profileRef, { ...profile, _createdAt: serverTimestamp() });
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export async function registerPatient(
  payload: RegisterPatientPayload
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    payload.email,
    payload.password
  );
  await sendEmailVerification(cred.user);
  await createUserProfile(cred.user.uid, 'patient', payload.name, payload.email);
  return cred;
}

export async function signInPatient(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

// ─── Caregiver ────────────────────────────────────────────────────────────────

export async function registerCaregiver(
  payload: RegisterCaregiverPayload
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    payload.email,
    payload.password
  );
  await sendEmailVerification(cred.user);
  await createUserProfile(cred.user.uid, 'caregiver', payload.name, payload.email);
  return cred;
}

export async function signInCaregiver(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

// ─── Doctor ───────────────────────────────────────────────────────────────────

export async function registerDoctor(
  payload: RegisterDoctorPayload
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    payload.email,
    payload.password
  );
  await sendEmailVerification(cred.user);
  // Doctors start as pending — a hospital_admin grants the 'doctor' custom claim
  await createUserProfile(cred.user.uid, 'doctor', payload.name, payload.email);
  return cred;
}

export async function signInDoctor(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

// ─── Administrator (Privileged — strictly pre-provisioned, no public self-signup) ───

export async function signInAdmin(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

/** Fetch the Firestore profile for a given Firebase UID */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/** Subscribe to Firebase auth state changes */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

/** Force-refresh the ID token to pick up new custom claims */
export async function refreshToken(user: User): Promise<void> {
  await user.getIdToken(true);
}

/** Read the role from the Firebase ID token claims */
export async function getRoleFromToken(
  user: User
): Promise<UserRole | null> {
  const result = await user.getIdTokenResult();
  return (result.claims['role'] as UserRole) ?? null;
}

/** Save condition selection to Firestore */
export async function saveCondition(
  uid: string,
  condition: CareCondition
): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(
    doc(db, 'users', uid),
    { condition, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** Mark onboarding as complete */
export async function markOnboardingComplete(uid: string): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(
    doc(db, 'users', uid),
    { onboardingComplete: true, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
