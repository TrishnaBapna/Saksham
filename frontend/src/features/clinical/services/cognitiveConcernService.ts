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
} from '../types/concern.types';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
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
    concernData: Omit<CognitiveConcern, 'id' | 'patientId' | 'recordedAt' | 'hasAcuteIndicators' | 'sharedWithDoctor' | 'status'> & {
      id?: string;
      patientId?: string;
      recordedAt?: string;
      sharedWithDoctor?: boolean;
      status?: CognitiveConcernStatus;
    }
  ): Promise<CognitiveConcern> {
    if (!patientId) throw new Error('Patient ID is required to record a cognitive concern.');

    const combinedText = `${concernData.description || ''} ${concernData.contextNotes || ''}`;
    const acuteCheck = this.detectAcuteIndicators(combinedText);

    // Enforce Default OFF for doctor sharing (Decision 3)
    const isSharedWithDoctor = concernData.sharedWithDoctor === true;

    const newConcern: CognitiveConcern = {
      id: concernData.id || `concern_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      recordedBy: concernData.recordedBy,
      recordedByName: concernData.recordedByName || 'Family / Caregiver',
      perspective: concernData.perspective || 'caregiver',
      category: concernData.category || 'functional_other',
      description: concernData.description.trim(),
      contextNotes: concernData.contextNotes ? concernData.contextNotes.trim() : undefined,
      recordedAt: concernData.recordedAt || new Date().toISOString(),
      status: concernData.status || 'ongoing',
      sharedWithDoctor: isSharedWithDoctor,
      hasAcuteIndicators: acuteCheck.hasAcuteWarning,
      acuteDisclaimerAcknowledged: concernData.acuteDisclaimerAcknowledged || false,
    };

    // 1. Local Storage Fallback
    const existing = this.getConcernsFromLocal(patientId);
    const updated = [newConcern, ...existing];
    this.saveConcernsToLocal(patientId, updated);

    // 2. Firestore Sync (Graceful offline degradation)
    if (isFirebaseConfigured && db) {
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
   */
  public static async getConcerns(patientId: string): Promise<CognitiveConcern[]> {
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

    return concerns;
  }

  /**
   * Toggles doctor sharing consent for an individual concern.
   */
  public static async updateConcernSharing(
    patientId: string,
    concernId: string,
    sharedWithDoctor: boolean
  ): Promise<CognitiveConcern | null> {
    const list = this.getConcernsFromLocal(patientId);
    const idx = list.findIndex((c) => c.id === concernId);
    if (idx === -1) return null;

    list[idx].sharedWithDoctor = sharedWithDoctor;
    this.saveConcernsToLocal(patientId, list);

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'users', patientId, 'cognitiveConcerns', concernId);
        await updateDoc(docRef, { sharedWithDoctor });
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

    list[idx].status = status;
    this.saveConcernsToLocal(patientId, list);

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'users', patientId, 'cognitiveConcerns', concernId);
        await updateDoc(docRef, { status });
      } catch {
        // Offline fallback
      }
    }

    return list[idx];
  }

  /**
   * Clinician-Only Assessment Recording.
   * Product Owner Decision 2: Strictly authenticated doctors can record externally administered scores.
   * Saksham never generates synthetic cognitive scores or reproduces copyrighted instruments.
   */
  public static async recordClinicalAssessment(
    patientId: string,
    assessmentData: Omit<ClinicalAssessmentRecord, 'id' | 'patientId' | 'recordedAt' | 'administeredExternally'> & {
      id?: string;
      patientId?: string;
      recordedAt?: string;
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
  private static getConcernsFromLocal(patientId: string): CognitiveConcern[] {
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
}
