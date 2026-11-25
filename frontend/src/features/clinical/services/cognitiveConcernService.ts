/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE F
 * Structured Cognitive Concern & Clinical Assessment Service
 *
 * Implements:
 * 1. Cognitive Concern Logging (Patient & Caregiver perspectives)
 * 2. Sharing Consent Control (OFF by default — Product Owner Decision 3)
 * 3. Urgent Medical / Delirium Guidance with 112 / 14416 distinctions (Product Owner Decision 1)
 * 4. Clinician-Only Assessment Recording (Product Owner Decision 2)
 *
 * 100% Spark Free Plan compliant ($0.00 cloud cost, local fallback + Firestore)
 */

import {
  CognitiveConcern,
  ClinicalAssessmentRecord,
  AcuteIndicatorCheckResult,
  CognitiveConcernStatus,
  CognitiveConcernCategory,
  DyadicDiscrepancyAnalysis,
} from '../types/concern.types';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import { SyncQueueService } from '../../../services/syncQueueService.js';
import { isGuestPatient } from '../../auth/services/identityService.js';
import { SecurityUtils } from '../../../utils/securityUtils.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';

const CONCERN_STORAGE_PREFIX = 'saksham_cognitive_concerns_';
const ASSESSMENT_STORAGE_PREFIX = 'saksham_clinical_assessments_';

// Emergency red flags that trigger warning even without temporal words (unless negated or chronic)
const DIRECT_RED_FLAGS: Array<{ regex: RegExp; name: string }> = [
  { regex: /\b(?:facial\s+)?droop(?:ing)?\b/i, name: 'facial droop' },
  { regex: /\b(?:cannot|unable to|can't)\s+speak\b/i, name: 'cannot speak' },
  { regex: /\bslurr(?:ed|ing)\s+speech\b/i, name: 'slurred speech' },
  { regex: /\bunconscious(?:ness)?\b/i, name: 'unconscious' },
  { regex: /\bunresponsive(?:ness)?\b/i, name: 'unresponsive' },
  { regex: /\bseizure(?:s)?\b/i, name: 'seizure' },
  { regex: /\bchest\s+pain\b/i, name: 'chest pain' },
  { regex: /\b(?:breathless(?:ness)?|short(?:ness)?\s+of\s+breath|difficulty\s+breathing)\b/i, name: 'breathlessness' },
  { regex: /\b(?:one[\s-]sided|unilateral)\s+weakness\b/i, name: 'one-sided weakness' },
  { regex: /\bweakness\s+(?:on|in)\s+(?:one|either|left|right)\s+side\b/i, name: 'weakness on one side' },
];

// Acute temporal markers indicating rapid onset over hours or days
const ACUTE_TEMPORAL = /\b(?:sudden(?:ly)?|abrupt(?:ly)?|rapid(?:ly)?|acute(?:ly)?|since\s+(?:this\s+)?morning|since\s+yesterday|over\s+(?:a\s+few|the\s+last\s+few|\d+)\s+hours|within\s+hours)\b/i;

// Secondary symptoms that trigger ONLY when combined with an acute temporal marker
const ACUTE_SYMPTOMS_REQUIRING_TEMPORAL: Array<{ regex: RegExp; name: string }> = [
  { regex: /\b(?:high\s+)?fever\b/i, name: 'fever' },
  { regex: /\b(?:severe\s+)?confusion\b/i, name: 'confusion' },
  { regex: /\b(?:extreme\s+)?agitation\b/i, name: 'agitation' },
  { regex: /\bhallucinat(?:ion|ions|ing)\b/i, name: 'hallucinations' },
  { regex: /\bdelirium\b/i, name: 'delirium' },
];

// Chronicity markers (symptoms existing for weeks/months/years or past medical history)
const CHRONICITY_PATTERNS = [
  /\b(?:for|over|past|last)\s+(?:\d+|several|many|a\s+few)\s+(?:months|years|weeks)\b/i,
  /\b(?:chronic|gradual(?:ly)?|long[\s-]standing|mild\s+forgetfulness|slowly\s+progressing)\b/i,
  /\b(?:history\s+of|prior|past)\s+(?:stroke|tia|seizure)\b/i,
  /\b\d+\s+years?\s+ago\b/i,
];

function isClauseNegated(clause: string, matchIndex: number): boolean {
  const preceding = clause.substring(0, matchIndex);
  return /\b(?:no|not|denies|denied|without|ruled\s+out|never|negative\s+for)\b[^.;]*$/i.test(preceding);
}

export class CognitiveConcernService {
  /**
   * Scans text for acute indicators, sudden onset, or neurological red flags.
   * Clause-based, negation-aware, history-aware, and chronicity-aware regex engine.
   * Product Owner Decision 1: Directs acute physical/neurological changes to 112 (EMS)
   * and psychological/mental distress to 14416 (Tele-MANAS, non-ambulance).
   */
  public static detectAcuteIndicators(text: string): AcuteIndicatorCheckResult {
    if (!text || typeof text !== 'string') {
      return {
        hasAcuteWarning: false,
        matchedKeywords: [],
        guidanceText: '',
        emergencyNumber: '112',
        helplineNumber: '14416',
      };
    }

    // Split on sentence boundaries and contrast conjunctions (e.g., ", but", ", however")
    const clauses = text
      .split(/[.;\n]+|,\s*(?:but|however|except|yet)\s+/i)
      .map((c) => c.trim())
      .filter(Boolean);

    const matched = new Set<string>();

    for (const clause of clauses) {
      const isChronic = CHRONICITY_PATTERNS.some((p) => p.test(clause));

      // 1. Direct Red Flags
      for (const flag of DIRECT_RED_FLAGS) {
        const match = flag.regex.exec(clause);
        if (match) {
          if (!isClauseNegated(clause, match.index) && !isChronic) {
            matched.add(flag.name);
          }
        }
      }

      // 2. Acute Temporal + Secondary Symptoms
      if (ACUTE_TEMPORAL.test(clause) && !isChronic) {
        for (const sym of ACUTE_SYMPTOMS_REQUIRING_TEMPORAL) {
          const match = sym.regex.exec(clause);
          if (match) {
            if (!isClauseNegated(clause, match.index)) {
              matched.add(`sudden ${sym.name}`);
            }
          }
        }
      }
    }

    const matchedArray = Array.from(matched);

    if (matchedArray.length > 0) {
      return {
        hasAcuteWarning: true,
        matchedKeywords: matchedArray,
        guidanceText:
          'Sudden changes appearing over hours or days may indicate an acute medical condition such as delirium, infection, medication side effects, or stroke rather than typical gradual dementia progression. Seek prompt medical evaluation. Call 112 for acute medical emergencies. Tele-MANAS (14416) provides mental health and psychological support, but is not an ambulance service. Safety notice: This automated check is a deterministic safety prompt and NOT a clinical diagnostic or screening instrument; absence of keywords does not rule out emergency conditions.',
        emergencyNumber: '112',
        helplineNumber: '14416',
      };
    }

    return {
      hasAcuteWarning: false,
      matchedKeywords: [],
      guidanceText: '',
      emergencyNumber: '112',
      helplineNumber: '14416',
    };
  }

  /**
   * Record a structured cognitive or functional concern.
   * Enforces Product Owner Decision 3: sharedWithDoctor is FALSE by default unless explicitly true.
   */
  public static async recordConcern(
    patientId: string,
    concernData: Omit<CognitiveConcern, 'id' | 'patientId' | 'recordedAt' | 'hasAcuteIndicators' | 'sharedWithDoctor' | 'status' | 'recordedBy'> & {
      id?: string;
      patientId?: string;
      recordedAt?: string;
      sharedWithDoctor?: boolean;
      status?: CognitiveConcernStatus;
      recordedBy?: string;
    },
    currentUserRole?: string
  ): Promise<CognitiveConcern> {
    if (!patientId) throw new Error('Patient ID is required to record a cognitive concern.');
    if (!SecurityUtils.isValidIdentifier(patientId)) {
      throw new Error('Invalid patient identifier.');
    }

    // Role-boundary validation: Verify caller is authorized for the requested perspective
    if (currentUserRole) {
      if (currentUserRole === 'doctor') {
        throw new Error('Permission denied: Doctors cannot record cognitive concerns directly; use clinical assessments.');
      }
      if (concernData.perspective === 'patient' && currentUserRole !== 'patient') {
        throw new Error('Permission denied: Only patients may record patient-perspective journal entries.');
      }
      if (concernData.perspective === 'caregiver' && currentUserRole !== 'caregiver') {
        throw new Error('Permission denied: Only authorized caregivers may record caregiver observation notes.');
      }
    }

    // Sanitize user inputs and enforce length boundaries
    const cleanDescription = SecurityUtils.sanitizePlainText(
      concernData.description,
      SecurityUtils.LIMITS.CONCERN_DESCRIPTION
    );
    if (!cleanDescription) {
      throw new Error('Concern description is required and cannot be empty.');
    }
    const cleanNotes = concernData.contextNotes
      ? SecurityUtils.sanitizePlainText(concernData.contextNotes, SecurityUtils.LIMITS.CONTEXT_NOTES)
      : undefined;

    const combinedText = `${cleanDescription} ${cleanNotes || ''}`;
    const acuteCheck = this.detectAcuteIndicators(combinedText);

    // Enforce Default OFF for doctor sharing (Decision 3)
    const isSharedWithDoctor = concernData.sharedWithDoctor === true;
    const isGuest = isGuestPatient(patientId);
    const syncStatus = isGuest
      ? 'local_only'
      : SyncQueueService.isOnline()
      ? 'synced'
      : 'pending_sync';

    const newConcern: CognitiveConcern = {
      id: concernData.id || `concern_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      recordedBy: concernData.recordedBy || (concernData as any).recordedById || patientId,
      recordedByName: concernData.recordedByName || (concernData.perspective === 'patient' ? 'Patient Self-Report' : 'Family / Caregiver'),
      recordedByRole: concernData.recordedByRole || (concernData.perspective === 'patient' ? 'patient' : 'caregiver'),
      perspective: concernData.perspective || 'caregiver',
      category: concernData.category || 'functional_other',
      description: cleanDescription,
      contextNotes: cleanNotes,
      recordedAt: concernData.recordedAt || new Date().toISOString(),
      status: concernData.status || 'ongoing',
      sharedWithDoctor: isSharedWithDoctor,
      discussAtAppointment: concernData.discussAtAppointment || false,
      hasAcuteIndicators: acuteCheck.hasAcuteWarning,
      acuteDisclaimerAcknowledged: concernData.acuteDisclaimerAcknowledged || false,
      syncStatus,
    };

    // 1. Local Storage Fallback
    const existing = this.getConcernsFromLocal(patientId);
    const updated = [newConcern, ...existing];
    this.saveConcernsToLocal(patientId, updated);

    // 2. Offline-First Sync Queue Enqueue
    if (!isGuest) {
      SyncQueueService.enqueue(patientId, 'cognitiveConcerns', newConcern.id, 'upsert', newConcern);
    }

    // 3. Firestore Sync (Graceful offline degradation)
    if (!isGuest && isFirebaseConfigured && db && SyncQueueService.isOnline()) {
      try {
        const concernDocRef = doc(db, 'users', patientId, 'cognitiveConcerns', newConcern.id);
        await setDoc(concernDocRef, newConcern, { merge: true });
      } catch {
        // In offline / Spark sandbox mode, local record is preserved
      }
    }

    return newConcern;
  }

  /**
   * Retrieves all logged concerns for a patient.
   * If callerRole is 'doctor', strictly filters to sharedWithDoctor === true to preserve patient privacy.
   */
  public static async getConcerns(
    patientId: string,
    includeArchived: boolean = false,
    callerRole?: string
  ): Promise<CognitiveConcern[]> {
    if (!patientId) return [];

    let concerns = this.getConcernsFromLocal(patientId);

    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, 'users', patientId, 'cognitiveConcerns');
        const q = query(colRef, orderBy('recordedAt', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const remoteConcerns: CognitiveConcern[] = [];
          snapshot.forEach((d) => remoteConcerns.push(d.data() as CognitiveConcern));
          concerns = remoteConcerns;
          this.saveConcernsToLocal(patientId, concerns);
        }
      } catch {
        // Fallback to local storage
      }
    }

    if (!includeArchived) {
      concerns = concerns.filter((c) => !c.isArchived);
    }

    // Role-boundary privacy filter: Doctors may ONLY see explicitly shared concerns (Decision 3)
    if (callerRole === 'doctor') {
      concerns = concerns.filter((c) => c.sharedWithDoctor === true);
    }

    return concerns;
  }

  /**
   * Convenience getter for clinicians ensuring unshared patient entries remain strictly private.
   */
  public static async getConcernsForDoctor(patientId: string): Promise<CognitiveConcern[]> {
    return this.getConcerns(patientId, false, 'doctor');
  }

  /**
   * Analyzes divergence between patient self-reports and caregiver observations.
   * Preserves provenance of both perspectives without destructive merging or diagnostic labeling.
   */
  public static analyzeDyadicDiscrepancy(concerns: CognitiveConcern[]): DyadicDiscrepancyAnalysis {
    const active = concerns.filter((c) => !c.isArchived);
    const patientConcerns = active.filter((c) => c.perspective === 'patient');
    const caregiverConcerns = active.filter((c) => c.perspective === 'caregiver');

    const categories: CognitiveConcernCategory[] = [
      'memory',
      'communication',
      'attention_planning',
      'daily_activities',
      'sleep_routine',
      'behavior_mood',
      'functional_other',
    ];

    const sharedCategories: CognitiveConcernCategory[] = [];
    const divergentCategories: DyadicDiscrepancyAnalysis['divergentCategories'] = [];
    const appointmentDiscussionRecommendations: string[] = [];

    for (const cat of categories) {
      const pForCat = patientConcerns.filter((c) => c.category === cat);
      const cForCat = caregiverConcerns.filter((c) => c.category === cat);

      if (pForCat.length > 0 && cForCat.length > 0) {
        const pStatus = pForCat[0].status;
        const cStatus = cForCat[0].status;

        if (pStatus === cStatus) {
          sharedCategories.push(cat);
        } else {
          divergentCategories.push({
            category: cat,
            patientStatus: pStatus,
            caregiverStatus: cStatus,
            patientConcernCount: pForCat.length,
            caregiverConcernCount: cForCat.length,
            explanation: `Dyadic divergence in ${cat}: Patient reported "${pStatus}" while caregiver observed "${cStatus}".`,
          });
          appointmentDiscussionRecommendations.push(
            `Discuss daily patterns in ${cat.replace('_', ' ')} with both patient and caregiver to understand situational differences.`
          );
        }
      } else if (pForCat.length > 0 && cForCat.length === 0) {
        divergentCategories.push({
          category: cat,
          patientStatus: pForCat[0].status,
          caregiverStatus: undefined,
          patientConcernCount: pForCat.length,
          caregiverConcernCount: 0,
          explanation: `Patient noted ${cat} concerns that were not logged by the caregiver.`,
        });
        appointmentDiscussionRecommendations.push(
          `Gently inquire about the patient's personal experience of ${cat.replace('_', ' ')} without invalidating either perspective.`
        );
      } else if (cForCat.length > 0 && pForCat.length === 0) {
        divergentCategories.push({
          category: cat,
          patientStatus: undefined,
          caregiverStatus: cForCat[0].status,
          patientConcernCount: 0,
          caregiverConcernCount: cForCat.length,
          explanation: `Caregiver observed ${cat} concerns not noted in patient's journal entries.`,
        });
        appointmentDiscussionRecommendations.push(
          `Explore caregiver observations of ${cat.replace('_', ' ')} collaboratively in a calm, supportive setting.`
        );
      }
    }

    return {
      patientConcernCount: patientConcerns.length,
      caregiverConcernCount: caregiverConcerns.length,
      sharedCategories,
      divergentCategories,
      appointmentDiscussionRecommendations,
      hasDiscrepancies: divergentCategories.length > 0,
    };
  }

  public static async detectDyadicPerspectiveDiscrepancy(patientId: string): Promise<DyadicDiscrepancyAnalysis> {
    const concerns = await this.getConcerns(patientId, false);
    return this.analyzeDyadicDiscrepancy(concerns);
  }

  /**
   * Toggles doctor sharing consent for an individual concern.
   * Enforces role boundary: Caregivers cannot modify doctor sharing consent for patient personal entries.
   */
  public static async updateConcernSharing(
    patientId: string,
    concernId: string,
    sharedWithDoctor: boolean,
    currentUserRole: string = 'patient'
  ): Promise<CognitiveConcern | null> {
    const list = this.getConcernsFromLocal(patientId);
    const idx = list.findIndex((c) => c.id === concernId);
    if (idx === -1) return null;

    // Role-boundary privacy check: Caregivers cannot override patient personal consent
    if (currentUserRole === 'caregiver' && list[idx].perspective === 'patient') {
      throw new Error('Permission denied: Caregivers cannot modify doctor sharing consent for patient personal entries.');
    }

    const isGuest = isGuestPatient(patientId);
    list[idx].sharedWithDoctor = sharedWithDoctor;
    list[idx].updatedAt = new Date().toISOString();
    list[idx].syncStatus = isGuest ? 'local_only' : SyncQueueService.isOnline() ? 'synced' : 'pending_sync';
    this.saveConcernsToLocal(patientId, list);

    if (!isGuest) {
      SyncQueueService.enqueue(patientId, 'cognitiveConcerns', concernId, 'upsert', list[idx]);
    }

    if (!isGuest && isFirebaseConfigured && db && SyncQueueService.isOnline()) {
      try {
        const docRef = doc(db, 'users', patientId, 'cognitiveConcerns', concernId);
        await updateDoc(docRef, { sharedWithDoctor, updatedAt: list[idx].updatedAt });
      } catch {
        // Offline fallback
      }
    }

    return list[idx];
  }

  /**
   * Updates status of an individual concern (ongoing / occasional / resolved).
   */
  public static async updateConcernStatus(
    patientId: string,
    concernId: string,
    status: CognitiveConcernStatus
  ): Promise<CognitiveConcern | null> {
    const list = this.getConcernsFromLocal(patientId);
    const idx = list.findIndex((c) => c.id === concernId);
    if (idx === -1) return null;

    const isGuest = isGuestPatient(patientId);
    list[idx].status = status;
    list[idx].updatedAt = new Date().toISOString();
    list[idx].syncStatus = isGuest ? 'local_only' : SyncQueueService.isOnline() ? 'synced' : 'pending_sync';
    this.saveConcernsToLocal(patientId, list);

    if (!isGuest) {
      SyncQueueService.enqueue(patientId, 'cognitiveConcerns', concernId, 'upsert', list[idx]);
    }

    if (!isGuest && isFirebaseConfigured && db && SyncQueueService.isOnline()) {
      try {
        const docRef = doc(db, 'users', patientId, 'cognitiveConcerns', concernId);
        await updateDoc(docRef, { status, updatedAt: list[idx].updatedAt });
      } catch {
        // Offline fallback
      }
    }

    return list[idx];
  }

  /**
   * Toggles whether this concern is flagged specifically to discuss at a clinical appointment.
   */
  public static async updateDiscussAtAppointment(
    patientId: string,
    concernId: string,
    discussAtAppointment: boolean
  ): Promise<CognitiveConcern | null> {
    const list = this.getConcernsFromLocal(patientId);
    const idx = list.findIndex((c) => c.id === concernId);
    if (idx === -1) return null;

    const isGuest = isGuestPatient(patientId);
    list[idx].discussAtAppointment = discussAtAppointment;
    list[idx].updatedAt = new Date().toISOString();
    list[idx].syncStatus = isGuest ? 'local_only' : SyncQueueService.isOnline() ? 'synced' : 'pending_sync';
    this.saveConcernsToLocal(patientId, list);

    if (!isGuest) {
      SyncQueueService.enqueue(patientId, 'cognitiveConcerns', concernId, 'upsert', list[idx]);
    }

    if (!isGuest && isFirebaseConfigured && db && SyncQueueService.isOnline()) {
      try {
        const docRef = doc(db, 'users', patientId, 'cognitiveConcerns', concernId);
        await updateDoc(docRef, { discussAtAppointment, updatedAt: list[idx].updatedAt });
      } catch {
        // Offline fallback
      }
    }

    return list[idx];
  }

  /**
   * Edits a previously recorded concern while preserving role boundaries (Part D).
   * Caregivers cannot edit or overwrite patient journal entries, and patients cannot edit caregiver records.
   */
  public static async updateConcern(
    patientId: string,
    concernId: string,
    updates: {
      description?: string;
      category?: CognitiveConcernCategory;
      contextNotes?: string;
      status?: CognitiveConcernStatus;
      sharedWithDoctor?: boolean;
      discussAtAppointment?: boolean;
    },
    currentUserRole: string = 'patient'
  ): Promise<CognitiveConcern | null> {
    const list = this.getConcernsFromLocal(patientId);
    const idx = list.findIndex((c) => c.id === concernId);
    if (idx === -1) return null;

    const existing = list[idx];

    // Enforce role-boundary invariant (Part D)
    if (existing.perspective === 'patient' && currentUserRole !== 'patient') {
      throw new Error('Permission denied: Caregivers cannot edit or overwrite patient journal entries.');
    }
    if (existing.perspective === 'caregiver' && currentUserRole === 'patient') {
      throw new Error('Permission denied: Patients cannot edit caregiver observation records.');
    }

    if (updates.description !== undefined) {
      existing.description = updates.description.trim();
    }
    if (updates.category !== undefined) {
      existing.category = updates.category;
    }
    if (updates.contextNotes !== undefined) {
      existing.contextNotes = updates.contextNotes ? updates.contextNotes.trim() : undefined;
    }
    if (updates.status !== undefined) {
      existing.status = updates.status;
    }
    if (updates.sharedWithDoctor !== undefined) {
      existing.sharedWithDoctor = updates.sharedWithDoctor;
    }
    if (updates.discussAtAppointment !== undefined) {
      existing.discussAtAppointment = updates.discussAtAppointment;
    }

    const isGuest = isGuestPatient(patientId);
    existing.updatedAt = new Date().toISOString();
    existing.syncStatus = isGuest ? 'local_only' : SyncQueueService.isOnline() ? 'synced' : 'pending_sync';

    const combinedText = `${existing.description} ${existing.contextNotes || ''}`;
    const acuteCheck = this.detectAcuteIndicators(combinedText);
    existing.hasAcuteIndicators = acuteCheck.hasAcuteWarning;

    this.saveConcernsToLocal(patientId, list);

    if (!isGuest) {
      SyncQueueService.enqueue(patientId, 'cognitiveConcerns', concernId, 'upsert', existing);
    }

    if (!isGuest && isFirebaseConfigured && db && SyncQueueService.isOnline()) {
      try {
        const docRef = doc(db, 'users', patientId, 'cognitiveConcerns', concernId);
        await updateDoc(docRef, { ...existing });
      } catch {
        // Offline fallback
      }
    }

    return existing;
  }

  /**
   * Deletes or archives a concern while preserving role boundaries (Part D).
   * Caregivers cannot delete patient journal entries, and patients cannot delete caregiver observations.
   */
  public static async deleteConcern(
    patientId: string,
    concernId: string,
    currentUserRole: string = 'patient'
  ): Promise<boolean> {
    const list = this.getConcernsFromLocal(patientId);
    const idx = list.findIndex((c) => c.id === concernId);
    if (idx === -1) return false;

    const existing = list[idx];

    // Enforce role-boundary invariant (Part D)
    if (existing.perspective === 'patient' && currentUserRole !== 'patient') {
      throw new Error('Permission denied: Caregivers cannot delete patient journal entries.');
    }
    if (existing.perspective === 'caregiver' && currentUserRole === 'patient') {
      throw new Error('Permission denied: Patients cannot delete caregiver observations.');
    }

    const isGuest = isGuestPatient(patientId);
    // Remove from active list
    const remaining = list.filter((c) => c.id !== concernId);
    this.saveConcernsToLocal(patientId, remaining);

    if (!isGuest) {
      SyncQueueService.enqueue(patientId, 'cognitiveConcerns', concernId, 'delete', { id: concernId, isArchived: true });
    }

    if (!isGuest && isFirebaseConfigured && db && SyncQueueService.isOnline()) {
      try {
        const docRef = doc(db, 'users', patientId, 'cognitiveConcerns', concernId);
        await updateDoc(docRef, { isArchived: true });
      } catch {
        // Offline fallback
      }
    }

    return true;
  }

  /**
   * Clinician-Only Assessment Recording.
   * Product Owner Decision 2: Strictly authenticated doctors can record externally administered scores.
   * Saksham never generates synthetic cognitive scores or reproduces copyrighted instruments.
   */
  public static async recordClinicalAssessment(
    patientId: string,
    assessmentData: Omit<
      ClinicalAssessmentRecord,
      'id' | 'patientId' | 'recordedAt' | 'administeredExternally' | 'doctorName' | 'administrationDate' | 'language' | 'qualitativeSummary'
    > & {
      id?: string;
      patientId?: string;
      recordedAt?: string;
      doctorName?: string;
      administrationDate?: string;
      language?: string;
      qualitativeSummary?: string;
    },
    currentUserRole?: string
  ): Promise<ClinicalAssessmentRecord> {
    if (currentUserRole !== 'doctor') {
      throw new Error(
        'Permission denied: Only authenticated healthcare professionals with a doctor role may record clinical assessment results.'
      );
    }
    if (!patientId) {
      throw new Error('Patient ID is required to record a clinical assessment.');
    }
    if (!assessmentData.doctorId) {
      throw new Error('Doctor ID is required.');
    }
    if (!assessmentData.assessmentName) {
      throw new Error('Assessment name (e.g., MMSE, MoCA, HMSE, ACE-III, CDR) is required.');
    }

    const newRecord: ClinicalAssessmentRecord = {
      id: assessmentData.id || `assessment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      doctorId: assessmentData.doctorId,
      doctorName: assessmentData.doctorName || 'Dr. Assigned Clinician',
      assessmentName: assessmentData.assessmentName,
      customAssessmentName: assessmentData.customAssessmentName,
      administrationDate: assessmentData.administrationDate || new Date().toISOString().split('T')[0],
      language: assessmentData.language || 'English',
      totalScore: assessmentData.totalScore !== undefined ? Number(assessmentData.totalScore) : undefined,
      maxScore: assessmentData.maxScore !== undefined ? Number(assessmentData.maxScore) : undefined,
      scoreClassification: assessmentData.scoreClassification,
      qualitativeSummary: (assessmentData.qualitativeSummary || '').trim(),
      administeredExternally: true,
      recordedAt: assessmentData.recordedAt || new Date().toISOString(),
    };

    // 1. Local Storage
    const existing = this.getAssessmentsFromLocal(patientId);
    const updated = [newRecord, ...existing];
    this.saveAssessmentsToLocal(patientId, updated);

    // 2. Firestore Sync
    if (isFirebaseConfigured && db) {
      try {
        const assessmentDocRef = doc(db, 'users', patientId, 'clinicalAssessments', newRecord.id);
        await setDoc(assessmentDocRef, newRecord, { merge: true });
      } catch {
        // Offline fallback
      }
    }

    return newRecord;
  }

  /**
   * Retrieves all clinical assessment records for a patient.
   */
  public static async getClinicalAssessments(patientId: string): Promise<ClinicalAssessmentRecord[]> {
    if (!patientId) return [];

    let records = this.getAssessmentsFromLocal(patientId);

    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, 'users', patientId, 'clinicalAssessments');
        const q = query(colRef, orderBy('administrationDate', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const remoteRecords: ClinicalAssessmentRecord[] = [];
          snapshot.forEach((d) => remoteRecords.push(d.data() as ClinicalAssessmentRecord));
          records = remoteRecords;
          this.saveAssessmentsToLocal(patientId, records);
        }
      } catch {
        // Offline fallback
      }
    }

    return records;
  }

  /**
   * Amends a previously recorded clinical assessment while preserving the historical audit log.
   * Strictly authorized doctors only (Product Owner Decision 2).
   */
  public static async amendClinicalAssessment(
    patientId: string,
    assessmentId: string,
    amendmentData: {
      qualitativeSummary?: string;
      totalScore?: number;
      scoreClassification?: string;
      amendmentReason: string;
      doctorId: string;
      doctorName?: string;
    },
    currentUserRole?: string
  ): Promise<ClinicalAssessmentRecord | null> {
    if (currentUserRole !== 'doctor') {
      throw new Error(
        'Permission denied: Only authenticated healthcare professionals with a doctor role may amend clinical assessment records.'
      );
    }
    if (!amendmentData.amendmentReason || !amendmentData.amendmentReason.trim()) {
      throw new Error('An auditable amendment reason is required to correct a clinical assessment record.');
    }

    const list = this.getAssessmentsFromLocal(patientId);
    const idx = list.findIndex((a) => a.id === assessmentId);
    if (idx === -1) return null;

    const record = list[idx];
    const previousSummary = record.qualitativeSummary;
    const previousScore = record.totalScore;

    const newAmendment = {
      amendedAt: new Date().toISOString(),
      amendedBy: amendmentData.doctorId,
      amendedByName: amendmentData.doctorName || 'Dr. Assigned Clinician',
      previousSummary,
      previousScore,
      amendmentReason: amendmentData.amendmentReason.trim(),
    };

    // 1. Fetch fresh remote document if Firebase is configured to avoid concurrent amendment loss
    let remoteAmendments: any[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const assessmentDocRef = doc(db, 'users', patientId, 'clinicalAssessments', assessmentId);
        const snap = await getDoc(assessmentDocRef);
        if (snap.exists()) {
          const remoteData = snap.data() as ClinicalAssessmentRecord;
          if (remoteData.amendments && Array.isArray(remoteData.amendments)) {
            remoteAmendments = remoteData.amendments;
          }
        }
      } catch {
        // Fallback to local
      }
    }

    const existingAmendments = record.amendments || [];
    // Merge remote and local amendments avoiding duplicates
    const mergedAmendmentsMap = new Map<string, any>();
    [...remoteAmendments, ...existingAmendments].forEach((am) => {
      const key = `${am.amendedAt}_${am.amendedBy}_${am.amendmentReason}`;
      mergedAmendmentsMap.set(key, am);
    });
    mergedAmendmentsMap.set(
      `${newAmendment.amendedAt}_${newAmendment.amendedBy}_${newAmendment.amendmentReason}`,
      newAmendment
    );

    record.amendments = Array.from(mergedAmendmentsMap.values());
    if (amendmentData.qualitativeSummary !== undefined) {
      record.qualitativeSummary = amendmentData.qualitativeSummary.trim();
    }
    if (amendmentData.totalScore !== undefined) {
      record.totalScore = Number(amendmentData.totalScore);
    }
    if (amendmentData.scoreClassification !== undefined) {
      record.scoreClassification = amendmentData.scoreClassification.trim();
    }

    this.saveAssessmentsToLocal(patientId, list);

    if (isFirebaseConfigured && db) {
      try {
        const assessmentDocRef = doc(db, 'users', patientId, 'clinicalAssessments', assessmentId);
        await updateDoc(assessmentDocRef, {
          qualitativeSummary: record.qualitativeSummary,
          totalScore: record.totalScore,
          scoreClassification: record.scoreClassification,
          amendments: record.amendments,
        });
      } catch {
        // Offline fallback
      }
    }

    return record;
  }

  // --- Local Storage Helpers ---
  public static getConcernsFromLocal(patientId: string): CognitiveConcern[] {
    try {
      const raw = localStorage.getItem(`${CONCERN_STORAGE_PREFIX}${patientId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveConcernsToLocal(patientId: string, concerns: CognitiveConcern[]): void {
    try {
      localStorage.setItem(`${CONCERN_STORAGE_PREFIX}${patientId}`, JSON.stringify(concerns));
    } catch {
      // Quota or storage unavailable
    }
  }

  private static getAssessmentsFromLocal(patientId: string): ClinicalAssessmentRecord[] {
    try {
      const raw = localStorage.getItem(`${ASSESSMENT_STORAGE_PREFIX}${patientId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveAssessmentsToLocal(patientId: string, assessments: ClinicalAssessmentRecord[]): void {
    try {
      localStorage.setItem(`${ASSESSMENT_STORAGE_PREFIX}${patientId}`, JSON.stringify(assessments));
    } catch {
      // Quota or storage unavailable
    }
  }

  /**
   * Governance notice and boundary definitions for formal assessment instruments (Phase 3.14.3)
   */
  public static getAssessmentGovernanceNotice() {
    return {
      nonDiagnosticNotice:
        'Standardized clinical assessments (HMSE, MMSE, MoCA, ACE-III, CDR) are formal clinical tools administered externally by qualified healthcare professionals. Saksham records summary scores and clinician domain observations only; it does not administer copyrighted items, calculate diagnostic cutoffs, or infer dementia severity.',
      copyrightNotice:
        'Saksham does not reproduce or distribute proprietary assessment battery questions or testing materials.',
      clinicianRoleRestricted: true,
      allowsAlgorithmicInterpretation: false,
    };
  }
}
