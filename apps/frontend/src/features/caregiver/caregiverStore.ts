import { create } from 'zustand';
import type { Task, CaregiverAlert, ClinicalNote, TelemetryRecord } from '@/types/firestore';
import {
  fetchLinkedPatients,
  subscribeToPatientTasks,
  subscribeToPatientAlerts,
  subscribeToPatientNotes,
  acknowledgeAlert,
  sendCaregiverNote,
  fetchPatientTelemetry,
  type LinkedPatientInfo,
} from './caregiverService';

interface CaregiverState {
  patients: LinkedPatientInfo[];
  activePatient: LinkedPatientInfo | null;
  tasks: Task[];
  alerts: CaregiverAlert[];
  notes: ClinicalNote[];
  telemetry: TelemetryRecord[];

  loading: boolean;
  tasksLoading: boolean;
  notesLoading: boolean;

  _unsubs: Array<() => void>;

  init: (caregiverUid: string, caregiverEmail: string) => Promise<void>;
  selectPatient: (patient: LinkedPatientInfo) => Promise<void>;
  acknowledgePatientAlert: (alertId: number) => Promise<void>;
  postNote: (title: string, body: string, authorName: string, authorUid: string) => Promise<void>;
  cleanup: () => void;
}

export const useCaregiverStore = create<CaregiverState>((set, get) => ({
  patients: [],
  activePatient: null,
  tasks: [],
  alerts: [],
  notes: [],
  telemetry: [],
  loading: true,
  tasksLoading: true,
  notesLoading: true,
  _unsubs: [],

  init: async (caregiverUid: string, caregiverEmail: string) => {
    set({ loading: true });
    try {
      const patients = await fetchLinkedPatients(caregiverUid, caregiverEmail);
      set({ patients, loading: false });

      if (patients.length > 0 && !get().activePatient) {
        await get().selectPatient(patients[0]!);
      }
    } catch (err) {
      console.warn('[caregiverStore] init error:', err);
      set({ loading: false });
    }
  },

  selectPatient: async (patient: LinkedPatientInfo) => {
    // Clear previous subscriptions
    get()._unsubs.forEach((fn) => fn());

    set({
      activePatient: patient,
      tasksLoading: true,
      notesLoading: true,
      _unsubs: [],
    });

    const unsubTasks = subscribeToPatientTasks(patient.uid, (tasks) => {
      set({ tasks, tasksLoading: false });
    });

    const unsubAlerts = subscribeToPatientAlerts(patient.uid, (alerts) => {
      set({ alerts });
    });

    const unsubNotes = subscribeToPatientNotes(patient.uid, (notes) => {
      set({ notes, notesLoading: false });
    });

    const telemetry = await fetchPatientTelemetry(patient.uid);

    set({
      telemetry,
      _unsubs: [unsubTasks, unsubAlerts, unsubNotes],
    });
  },

  acknowledgePatientAlert: async (alertId: number) => {
    const patient = get().activePatient;
    if (!patient) return;

    // Optimistic
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
    }));

    try {
      await acknowledgeAlert(patient.uid, alertId);
    } catch (err) {
      console.warn('[caregiverStore] acknowledge alert error:', err);
    }
  },

  postNote: async (title: string, body: string, authorName: string, authorUid: string) => {
    const patient = get().activePatient;
    if (!patient) throw new Error('No active patient selected.');

    await sendCaregiverNote(patient.uid, {
      authorName,
      authorUid,
      title,
      body,
    });
  },

  cleanup: () => {
    get()._unsubs.forEach((fn) => fn());
    set({
      patients: [],
      activePatient: null,
      tasks: [],
      alerts: [],
      notes: [],
      telemetry: [],
      loading: true,
      _unsubs: [],
    });
  },
}));
