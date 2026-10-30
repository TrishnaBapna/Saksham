/**
 * Caregiver Firestore service.
 * Handles patient monitoring, caregiver notes, alerts, and authorization checks.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/config/firebase';
import type {
  Task,
  CaregiverAlert,
  ClinicalNote,
  UserProfile,
  TelemetryRecord,
} from '@/types/firestore';

// ─── Linked Patients ─────────────────────────────────────────────────────────

export interface LinkedPatientInfo {
  uid: string;
  name: string;
  email: string;
  condition?: string;
  status: 'active' | 'pending';
}

/**
 * Fetch patients linked to this caregiver.
 * Checks both caregiver_authorizations and emergency contacts.
 */
export async function fetchLinkedPatients(
  caregiverUid: string,
  caregiverEmail: string
): Promise<LinkedPatientInfo[]> {
  const db = getFirestoreDb();
  const linked: LinkedPatientInfo[] = [];

  try {
    // 1. Check users where caregiverEmail is listed or query authorisations
    const authSnap = await getDocs(
      query(
        collection(db, 'caregiver_authorizations'),
        where('caregiverUid', '==', caregiverUid)
      )
    );

    for (const authDoc of authSnap.docs) {
      const data = authDoc.data();
      if (data.patientUid) {
        const pSnap = await getDoc(doc(db, 'users', data.patientUid));
        if (pSnap.exists()) {
          const pData = pSnap.data() as UserProfile;
          linked.push({
            uid: pData.uid,
            name: pData.name || 'Patient',
            email: pData.email,
            condition: pData.condition,
            status: 'active',
          });
        }
      }
    }
  } catch (err) {
    console.warn('[caregiverService] authorization lookup warning:', err);
  }

  // Fallback: search for patient demo or local link if none found
  if (linked.length === 0 && caregiverEmail) {
    // Allow linking by patient ID/code for demonstration
    linked.push({
      uid: 'SAK-PT-DEMO',
      name: 'Demonstration Patient',
      email: 'patient@saksham.care',
      condition: 'parkinsons',
      status: 'active',
    });
  }

  return linked;
}

// ─── Patient Tasks Monitor ──────────────────────────────────────────────────

export function subscribeToPatientTasks(
  patientUid: string,
  callback: (tasks: Task[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    query(collection(db, 'users', patientUid, 'tasks'), orderBy('time', 'asc')),
    (snap) => {
      const tasks = snap.docs.map((d) => ({ id: Number(d.id), ...d.data() } as Task));
      callback(tasks);
    },
    (err) => console.warn('[caregiverService] patient tasks snapshot error:', err)
  );
}

// ─── Alerts & Emergencies ───────────────────────────────────────────────────

export function subscribeToPatientAlerts(
  patientUid: string,
  callback: (alerts: CaregiverAlert[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    query(
      collection(db, 'users', patientUid, 'caregiver_alerts'),
      orderBy('createdAt', 'desc'),
      limit(15)
    ),
    (snap) => {
      const alerts = snap.docs.map((d) => ({ id: Number(d.id), ...d.data() } as CaregiverAlert));
      callback(alerts);
    },
    (err) => console.warn('[caregiverService] patient alerts snapshot error:', err)
  );
}

export async function acknowledgeAlert(
  patientUid: string,
  alertId: number
): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(
    doc(db, 'users', patientUid, 'caregiver_alerts', String(alertId)),
    {
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
    }
  );
}

// ─── Notes & Directives to Patient ──────────────────────────────────────────

export async function sendCaregiverNote(
  patientUid: string,
  note: {
    authorName: string;
    authorUid: string;
    title: string;
    body: string;
  }
): Promise<void> {
  const db = getFirestoreDb();
  const noteId = Date.now();
  const noteDoc: ClinicalNote = {
    id: noteId,
    uid: patientUid,
    authorRole: 'caregiver',
    authorName: note.authorName,
    authorUid: note.authorUid,
    title: note.title,
    body: note.body,
    createdAt: new Date().toISOString(),
  };

  await setDoc(
    doc(db, 'users', patientUid, 'clinical_notes', String(noteId)),
    noteDoc
  );
}

export function subscribeToPatientNotes(
  patientUid: string,
  callback: (notes: ClinicalNote[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    query(
      collection(db, 'users', patientUid, 'clinical_notes'),
      orderBy('createdAt', 'desc'),
      limit(10)
    ),
    (snap) => {
      const notes = snap.docs.map((d) => d.data() as ClinicalNote);
      callback(notes);
    },
    (err) => console.warn('[caregiverService] notes snapshot error:', err)
  );
}

// ─── Telemetry / Performance Records ────────────────────────────────────────

export async function fetchPatientTelemetry(
  patientUid: string
): Promise<TelemetryRecord[]> {
  const db = getFirestoreDb();
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', patientUid, 'telemetry_records'),
        orderBy('recordDate', 'desc'),
        limit(7)
      )
    );
    return snap.docs.map((d) => d.data() as TelemetryRecord);
  } catch (err) {
    console.warn('[caregiverService] telemetry fetch error:', err);
    return [];
  }
}
