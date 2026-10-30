import { create } from 'zustand';
import type { DoctorDirective, ClinicalNote, TelemetryRecord } from '@/types/firestore';
import {
  fetchAssignedPatients,
  createDoctorDirective,
  subscribeToDoctorDirectives,
  fetchClinicalNotesHistory,
  fetchLongitudinalTelemetry,
  type AssignedPatient,
} from './doctorService';

interface DoctorState {
  patients: AssignedPatient[];
  activePatient: AssignedPatient | null;
  directives: DoctorDirective[];
  notesHistory: ClinicalNote[];
  telemetry: TelemetryRecord[];

  loading: boolean;
  directivesLoading: boolean;

  _unsubs: Array<() => void>;

  init: (doctorUid: string, doctorEmail: string) => Promise<void>;
  selectPatient: (patient: AssignedPatient) => Promise<void>;
  postDirective: (
    title: string,
    body: string,
    doctorName: string,
    doctorUid: string
  ) => Promise<void>;
  cleanup: () => void;
}

export const useDoctorStore = create<DoctorState>((set, get) => ({
  patients: [],
  activePatient: null,
  directives: [],
  notesHistory: [],
  telemetry: [],
  loading: true,
  directivesLoading: true,
  _unsubs: [],

  init: async (doctorUid: string, doctorEmail: string) => {
    set({ loading: true });
    try {
      const patients = await fetchAssignedPatients(doctorUid, doctorEmail);
      set({ patients, loading: false });

      if (patients.length > 0 && !get().activePatient) {
        await get().selectPatient(patients[0]!);
      }
    } catch (err) {
      console.warn('[doctorStore] init error:', err);
      set({ loading: false });
    }
  },

  selectPatient: async (patient: AssignedPatient) => {
    get()._unsubs.forEach((fn) => fn());

    set({
      activePatient: patient,
      directivesLoading: true,
      _unsubs: [],
    });

    const unsubDirectives = subscribeToDoctorDirectives(patient.uid, (directives) => {
      set({ directives, directivesLoading: false });
    });

    const notesHistory = await fetchClinicalNotesHistory(patient.uid);
    const telemetry = await fetchLongitudinalTelemetry(patient.uid);

    set({
      notesHistory,
      telemetry,
      _unsubs: [unsubDirectives],
    });
  },

  postDirective: async (
    title: string,
    body: string,
    doctorName: string,
    doctorUid: string
  ) => {
    const patient = get().activePatient;
    if (!patient) throw new Error('No patient selected.');

    await createDoctorDirective(patient.uid, {
      title,
      body,
      doctorName,
      doctorUid,
    });
  },

  cleanup: () => {
    get()._unsubs.forEach((fn) => fn());
    set({
      patients: [],
      activePatient: null,
      directives: [],
      notesHistory: [],
      telemetry: [],
      loading: true,
      _unsubs: [],
    });
  },
}));
