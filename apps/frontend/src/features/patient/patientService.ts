/**
 * Patient-facing Firestore service.
 * All reads/writes for the patient portal go through this module.
 */
import {
  doc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/config/firebase';
import type {
  Task,
  TaskStatus,
  UserProgression,
  ClinicalNote,
  DoctorDirective,
  CaregiverAlert,
  LovedOne,
} from '@/types/firestore';

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(uid: string): Promise<Task[]> {
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'tasks'), orderBy('time', 'asc'))
  );
  return snap.docs.map((d) => ({ id: Number(d.id), ...d.data() } as Task));
}

export async function updateTaskStatus(
  uid: string,
  taskId: number,
  status: TaskStatus,
  extra: Partial<Task> = {}
): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, 'users', uid, 'tasks', String(taskId)), {
    status,
    updatedAt: new Date().toISOString(),
    ...extra,
  });
}

/** Subscribe to real-time task updates */
export function subscribeToTasks(
  uid: string,
  callback: (tasks: Task[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    query(collection(db, 'users', uid, 'tasks'), orderBy('time', 'asc')),
    (snap) => {
      const tasks = snap.docs.map(
        (d) => ({ id: Number(d.id), ...d.data() } as Task)
      );
      callback(tasks);
    },
    (err) => console.warn('[patientService] tasks snapshot error:', err)
  );
}

// ─── Progression ──────────────────────────────────────────────────────────────

export async function fetchProgression(uid: string): Promise<UserProgression | null> {
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'progression'), limit(1))
  );
  if (snap.empty) return null;
  return snap.docs[0]!.data() as UserProgression;
}

export async function updateProgression(
  uid: string,
  patch: Partial<UserProgression>
): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(
    doc(db, 'users', uid, 'progression', 'current'),
    { ...patch, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export function subscribeToProgression(
  uid: string,
  callback: (p: UserProgression | null) => void
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    doc(db, 'users', uid, 'progression', 'current'),
    (snap) => callback(snap.exists() ? (snap.data() as UserProgression) : null),
    (err) => console.warn('[patientService] progression snapshot error:', err)
  );
}

// ─── Care team messages (read-only for patient) ────────────────────────────────

export async function fetchClinicalNotes(uid: string): Promise<ClinicalNote[]> {
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'clinical_notes'),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
  );
  return snap.docs.map((d) => d.data() as ClinicalNote);
}

export async function fetchDoctorDirectives(
  uid: string
): Promise<DoctorDirective[]> {
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'doctor_directives'),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
  );
  return snap.docs.map((d) => d.data() as DoctorDirective);
}

export function subscribeToMessages(
  uid: string,
  callback: (notes: ClinicalNote[], directives: DoctorDirective[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  let latestNotes: ClinicalNote[] = [];
  let latestDirectives: DoctorDirective[] = [];

  const unsubNotes = onSnapshot(
    query(
      collection(db, 'users', uid, 'clinical_notes'),
      orderBy('createdAt', 'desc'),
      limit(10)
    ),
    (snap) => {
      latestNotes = snap.docs.map((d) => d.data() as ClinicalNote);
      callback(latestNotes, latestDirectives);
    },
    (err) => console.warn('[patientService] notes snapshot error:', err)
  );

  const unsubDirectives = onSnapshot(
    query(
      collection(db, 'users', uid, 'doctor_directives'),
      orderBy('createdAt', 'desc'),
      limit(10)
    ),
    (snap) => {
      latestDirectives = snap.docs.map((d) => d.data() as DoctorDirective);
      callback(latestNotes, latestDirectives);
    },
    (err) => console.warn('[patientService] directives snapshot error:', err)
  );

  return () => { unsubNotes(); unsubDirectives(); };
}

// ─── Caregiver alerts (read-only for patient) ─────────────────────────────────

export function subscribeToAlerts(
  uid: string,
  callback: (alerts: CaregiverAlert[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    query(
      collection(db, 'users', uid, 'caregiver_alerts'),
      orderBy('createdAt', 'desc'),
      limit(5)
    ),
    (snap) => {
      callback(snap.docs.map((d) => d.data() as CaregiverAlert));
    },
    (err) => console.warn('[patientService] alerts snapshot error:', err)
  );
}

// ─── Default tasks seed (first login fallback) ───────────────────────────────

export const DEFAULT_TASKS: Omit<Task, 'uid'>[] = [
  { id: 1,  label: 'Morning Medication',    icon: '💊', time: '08:00 AM', status: 'pending' },
  { id: 2,  label: 'Breakfast',             icon: '🍳', time: '08:30 AM', status: 'pending' },
  { id: 3,  label: 'Morning Walk',          icon: '🚶', time: '09:00 AM', status: 'pending' },
  { id: 4,  label: 'Speech Exercise',       icon: '🗣️', time: '10:00 AM', status: 'pending' },
  { id: 5,  label: 'Hydration Check',       icon: '💧', time: '11:00 AM', status: 'pending' },
  { id: 6,  label: 'Lunch',                 icon: '🍱', time: '01:00 PM', status: 'pending' },
  { id: 7,  label: 'Afternoon Rest',        icon: '😴', time: '02:00 PM', status: 'pending' },
  { id: 8,  label: 'Evening Medication',    icon: '💊', time: '05:00 PM', status: 'pending' },
  { id: 9,  label: 'Evening Walk',          icon: '🌇', time: '06:00 PM', status: 'pending' },
  { id: 10, label: 'Relaxation / Reading',  icon: '📖', time: '08:00 PM', status: 'pending' },
];

export async function seedDefaultTasks(uid: string): Promise<void> {
  const db = getFirestoreDb();
  const existing = await getDocs(collection(db, 'users', uid, 'tasks'));
  if (!existing.empty) return; // don't overwrite existing tasks

  await Promise.all(
    DEFAULT_TASKS.map((t) =>
      setDoc(doc(db, 'users', uid, 'tasks', String(t.id)), {
        ...t,
        uid,
        createdAt: new Date().toISOString(),
      })
    )
  );
}

// ─── Loved Ones & Care Circle (Vault) ────────────────────────────────────────

export async function fetchLovedOnes(uid: string): Promise<LovedOne[]> {
  const db = getFirestoreDb();
  const snap = await getDocs(collection(db, 'users', uid, 'loved_ones'));
  return snap.docs.map((d) => ({ id: Number(d.id), ...d.data() } as LovedOne));
}
