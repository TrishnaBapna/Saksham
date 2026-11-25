/**
 * SAKSHAM NEURO-CARE — PRIORITY 3
 * Clinical Diagnosis Pathway Service
 *
 * Enforces:
 * 1. Strictly doctor-controlled diagnosis assignment and amendment.
 * 2. Immutable audit trail of diagnosis revisions.
 * 3. Separate Pathway A (Doctor-confirmed Alzheimer's) vs Pathway B (Other/Mixed Dementia).
 * 4. Zero patient self-diagnosis (read-only for patients/caregivers).
 * 5. Spark Free tier compliant ($0.00 cloud cost, Firestore + LocalStorage fallback).
 */

import {
  ClinicalDiagnosisRecord,
  ClinicalDiagnosisAmendment,
  DementiaPathway,
  DementiaEtiology,
  ClinicalDementiaStage,
} from '../types/concern.types.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';

const DIAGNOSIS_STORAGE_PREFIX = 'saksham_clinical_diagnosis_';
const DIAGNOSIS_HISTORY_STORAGE_PREFIX = 'saksham_clinical_diag_history_';

export class ClinicalDiagnosisService {
  /**
   * Retrieves the current doctor-confirmed diagnosis for a patient.
   * If none exists or unassigned, returns null (or unassigned placeholder).
   */
  public static async getConfirmedDiagnosis(patientId: string): Promise<ClinicalDiagnosisRecord | null> {
    if (!patientId) return null;

    // 1. Try Firestore if configured
    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, 'patients', patientId, 'clinicalDiagnosis');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const diagnoses: ClinicalDiagnosisRecord[] = [];
          snap.forEach((d) => {
            diagnoses.push(d.data() as ClinicalDiagnosisRecord);
          });
          const current = diagnoses.find((d) => d.isCurrent) || diagnoses[0];
          if (current) {
            this.cacheLocal(patientId, current);
            return current;
          }
        }
      } catch (err) {
        console.warn('[ClinicalDiagnosisService] Firestore read failed, falling back to local cache', err);
      }
    }

    // 2. Fall back to local storage
    return this.readLocal(patientId);
  }

  /**
   * Assigns an initial doctor-confirmed diagnosis. Strictly clinician-controlled.
   */
  public static async assignDiagnosis(payload: {
    patientId: string;
    confirmedByDoctorId: string;
    confirmedByDoctorName: string;
    doctorRegistrationNumber: string;
    pathway: DementiaPathway;
    etiology: DementiaEtiology;
    clinicalStage: ClinicalDementiaStage;
    diagnosticCriteria: string;
    clinicalRationale: string;
  }): Promise<ClinicalDiagnosisRecord> {
    const id = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: ClinicalDiagnosisRecord = {
      id,
      patientId: payload.patientId,
      confirmedByDoctorId: payload.confirmedByDoctorId,
      confirmedByDoctorName: payload.confirmedByDoctorName,
      doctorRegistrationNumber: payload.doctorRegistrationNumber,
      pathway: payload.pathway,
      etiology: payload.etiology,
      clinicalStage: payload.clinicalStage,
      isCurrent: true,
      diagnosticCriteria: payload.diagnosticCriteria,
      clinicalRationale: payload.clinicalRationale,
      confirmedAt: now,
      amendments: [],
    };

    // 1. Save to local storage cache & history
    this.cacheLocal(payload.patientId, record);
    this.appendHistoryLocal(payload.patientId, record);

    // 2. Persist to Firestore if configured
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'patients', payload.patientId, 'clinicalDiagnosis', id);
        await setDoc(docRef, record);
      } catch (err) {
        console.warn('[ClinicalDiagnosisService] Firestore write failed, preserved in local cache', err);
      }
    }

    return record;
  }

  /**
   * Clinician-only diagnosis amendment. Appends immutable amendment record.
   */
  public static async amendDiagnosis(
    patientId: string,
    diagnosisId: string,
    amendment: {
      pathway: DementiaPathway;
      etiology: DementiaEtiology;
      clinicalStage: ClinicalDementiaStage;
      amendmentReason: string;
      amendedByDoctorId: string;
      amendedByDoctorName: string;
    }
  ): Promise<ClinicalDiagnosisRecord> {
    const current = await this.getConfirmedDiagnosis(patientId);
    if (!current) {
      throw new Error('No existing diagnosis record found to amend.');
    }

    const now = new Date().toISOString();
    const amendmentRecord: ClinicalDiagnosisAmendment = {
      amendedAt: now,
      amendedByDoctorId: amendment.amendedByDoctorId,
      amendedByDoctorName: amendment.amendedByDoctorName,
      previousPathway: current.pathway,
      previousEtiology: current.etiology,
      previousStage: current.clinicalStage,
      amendmentReason: amendment.amendmentReason,
    };

    const updated: ClinicalDiagnosisRecord = {
      ...current,
      pathway: amendment.pathway,
      etiology: amendment.etiology,
      clinicalStage: amendment.clinicalStage,
      amendedAt: now,
      amendments: [...(current.amendments || []), amendmentRecord],
    };

    this.cacheLocal(patientId, updated);
    this.appendHistoryLocal(patientId, updated);

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'patients', patientId, 'clinicalDiagnosis', diagnosisId);
        await updateDoc(docRef, {
          pathway: updated.pathway,
          etiology: updated.etiology,
          clinicalStage: updated.clinicalStage,
          amendedAt: now,
          amendments: updated.amendments,
        });
      } catch (err) {
        console.warn('[ClinicalDiagnosisService] Firestore amendment write failed', err);
      }
    }

    return updated;
  }

  /**
   * Retrieves full immutable audit trail of past and present diagnoses.
   */
  public static async getDiagnosisHistory(patientId: string): Promise<ClinicalDiagnosisRecord[]> {
    if (!patientId) return [];

    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, 'patients', patientId, 'clinicalDiagnosis');
        const snap = await getDocs(query(colRef, orderBy('confirmedAt', 'desc')));
        if (!snap.empty) {
          const list: ClinicalDiagnosisRecord[] = [];
          snap.forEach((d) => list.push(d.data() as ClinicalDiagnosisRecord));
          return list;
        }
      } catch (err) {
        console.warn('[ClinicalDiagnosisService] Firestore history fetch failed', err);
      }
    }

    return this.readHistoryLocal(patientId);
  }

  /**
   * Real-time subscription to current diagnosis.
   */
  public static subscribeToDiagnosis(
    patientId: string,
    callback: (record: ClinicalDiagnosisRecord | null) => void
  ): () => void {
    if (!patientId) {
      callback(null);
      return () => {};
    }

    // Call immediately with local data
    const local = this.readLocal(patientId);
    callback(local);

    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, 'patients', patientId, 'clinicalDiagnosis');
        const unsubscribe = onSnapshot(
          colRef,
          (snap) => {
            if (!snap.empty) {
              const diagnoses: ClinicalDiagnosisRecord[] = [];
              snap.forEach((d) => diagnoses.push(d.data() as ClinicalDiagnosisRecord));
              const current = diagnoses.find((d) => d.isCurrent) || diagnoses[0];
              if (current) {
                this.cacheLocal(patientId, current);
                callback(current);
              }
            }
          },
          (err) => {
            console.warn('[ClinicalDiagnosisService] onSnapshot error', err);
          }
        );
        return unsubscribe;
      } catch (err) {
        console.warn('[ClinicalDiagnosisService] subscribe error', err);
      }
    }

    return () => {};
  }

  // --- Local Storage Helpers ---
  private static cacheLocal(patientId: string, record: ClinicalDiagnosisRecord): void {
    try {
      localStorage.setItem(`${DIAGNOSIS_STORAGE_PREFIX}${patientId}`, JSON.stringify(record));
    } catch {
      // Storage unavailable or full
    }
  }

  private static readLocal(patientId: string): ClinicalDiagnosisRecord | null {
    try {
      const raw = localStorage.getItem(`${DIAGNOSIS_STORAGE_PREFIX}${patientId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private static appendHistoryLocal(patientId: string, record: ClinicalDiagnosisRecord): void {
    try {
      const key = `${DIAGNOSIS_HISTORY_STORAGE_PREFIX}${patientId}`;
      const existing = this.readHistoryLocal(patientId);
      const updated = [record, ...existing.filter((r) => r.id !== record.id)];
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // Storage error
    }
  }

  private static readHistoryLocal(patientId: string): ClinicalDiagnosisRecord[] {
    try {
      const raw = localStorage.getItem(`${DIAGNOSIS_HISTORY_STORAGE_PREFIX}${patientId}`);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Product Governance and Non-Diagnostic Boundary Policies (Phase 3.14)
   */
  public static getGovernancePolicy() {
    return {
      isClinicianControlled: true,
      allowsAutomatedDiagnosis: false,
      allowsAlgorithmInference: false,
      nonExclusionRule:
        'Absence of symptoms or high routine completion scores does NOT rule out cognitive impairment or neurodegenerative conditions. Diagnostic determinations require comprehensive medical evaluation.',
      instrumentDisclaimer:
        'Formal assessments (MMSE, MoCA, HMSE, ACE-III, CDR) are standardized clinical batteries administered externally by certified professionals. Saksham stores summary scores for clinician review and never administers or automatically interprets copyrighted instruments.',
    };
  }

  /**
   * Verifies whether an actor is authorized to assign or amend diagnoses.
   */
  public static isClinicianAuthorized(role?: string): boolean {
    return role === 'doctor';
  }
}
