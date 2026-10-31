/**
 * Doctor Firestore service.
 * Handles clinical patient oversight, directives, telemetry review, and medical care plans.
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/config/firebase';
import type {
  DoctorDirective,
  ClinicalNote,
  TelemetryRecord,
  UserProfile,
} from '@/types/firestore';

export interface AssignedPatient {
  uid: string;
  name: string;
  email: string;
  condition: string;
  dateOfBirth?: string;
  phone?: string;
  lastVisit?: string;
  status?: 'active' | 'pending';
}

// ─── Assigned Patients ───────────────────────────────────────────────────────

export async function fetchAssignedPatients(
  doctorUid: string,
  doctorEmail: string
): Promise<AssignedPatient[]> {
  const db = getFirestoreDb();
  const patients: AssignedPatient[] = [];

  try {
    const snap = await getDocs(
      query(
        collection(db, 'doctor_assignments'),
        where('doctorUid', '==', doctorUid)
      )
    );

    for (const d of snap.docs) {
      const data = d.data();
      if (data.patientUid) {
        const pDocs = await getDocs(
          query(collection(db, 'users'), where('uid', '==', data.patientUid))
        );
        if (!pDocs.empty) {
          const pData = pDocs.docs[0]!.data() as UserProfile;
          patients.push({
            uid: pData.uid,
            name: pData.name || 'Patient',
            email: pData.email,
            condition: pData.condition || 'parkinsons',
            dateOfBirth: pData.dateOfBirth,
            phone: pData.phone,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[doctorService] assignments query error:', err);
  }

  // Fallback demo clinical cohort if none assigned yet
  if (patients.length === 0 && doctorEmail) {
    patients.push(
      {
        uid: 'SAK-PT-8842',
        name: 'Suresh Verma',
        email: 'suresh.verma@example.com',
        condition: 'parkinsons',
        dateOfBirth: '1958-04-12',
        phone: '+91 98201 12345',
        lastVisit: '2026-10-24',
      },
      {
        uid: 'SAK-PT-9011',
        name: 'Meena Kulkarni',
        email: 'meena.k@example.com',
        condition: 'alzheimers',
        dateOfBirth: '1962-09-18',
        phone: '+91 98202 67890',
        lastVisit: '2026-10-15',
      }
    );
  }

  return patients;
}

// ─── Directives ─────────────────────────────────────────────────────────────

export async function createDoctorDirective(
  patientUid: string,
  directive: {
    doctorName: string;
    doctorUid: string;
    title: string;
    body: string;
  }
): Promise<void> {
  const db = getFirestoreDb();
  const id = Date.now();
  const docData: DoctorDirective = {
    id,
    uid: patientUid,
    doctorName: directive.doctorName,
    doctorUid: directive.doctorUid,
    title: directive.title,
    body: directive.body,
    createdAt: new Date().toISOString(),
  };

  await setDoc(
    doc(db, 'users', patientUid, 'doctor_directives', String(id)),
    docData
  );
}

export function subscribeToDoctorDirectives(
  patientUid: string,
  callback: (directives: DoctorDirective[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  return onSnapshot(
    query(
      collection(db, 'users', patientUid, 'doctor_directives'),
      orderBy('createdAt', 'desc'),
      limit(20)
    ),
    (snap) => {
      const dirs = snap.docs.map((d) => d.data() as DoctorDirective);
      callback(dirs);
    },
    (err) => console.warn('[doctorService] directives snapshot error:', err)
  );
}

// ─── Clinical History & Telemetry ───────────────────────────────────────────

export async function fetchClinicalNotesHistory(
  patientUid: string
): Promise<ClinicalNote[]> {
  const db = getFirestoreDb();
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', patientUid, 'clinical_notes'),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
    );
    return snap.docs.map((d) => d.data() as ClinicalNote);
  } catch (err) {
    console.warn('[doctorService] clinical notes error:', err);
    return [];
  }
}

export async function fetchLongitudinalTelemetry(
  patientUid: string
): Promise<TelemetryRecord[]> {
  const db = getFirestoreDb();
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', patientUid, 'telemetry_records'),
        orderBy('recordDate', 'desc'),
        limit(14)
      )
    );
    const records = snap.docs.map((d) => d.data() as TelemetryRecord);
    if (records.length > 0) return records;
  } catch (err) {
    console.warn('[doctorService] telemetry fetch error:', err);
  }

  // Default synthetic clinical series if Firestore empty
  return [
    {
      uid: patientUid,
      day: 29,
      recordDate: '2026-10-29',
      status: 'all_done',
      tasksCompleted: 9,
      tasksTotal: 10,
      latencyMinutes: 6.2,
      speechDb: 64,
      tremorAmplitudeCm: 0.8,
    },
    {
      uid: patientUid,
      day: 28,
      recordDate: '2026-10-28',
      status: 'delayed',
      tasksCompleted: 8,
      tasksTotal: 10,
      latencyMinutes: 8.5,
      speechDb: 61,
      tremorAmplitudeCm: 1.2,
    },
    {
      uid: patientUid,
      day: 27,
      recordDate: '2026-10-27',
      status: 'all_done',
      tasksCompleted: 10,
      tasksTotal: 10,
      latencyMinutes: 5.1,
      speechDb: 66,
      tremorAmplitudeCm: 0.7,
    },
  ];
}
