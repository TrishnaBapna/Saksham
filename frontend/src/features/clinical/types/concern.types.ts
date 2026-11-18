/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE F
 * Structured Cognitive Concern & Clinical Assessment Types
 * 100% Firebase Spark Free Tier compliant — strictly non-diagnostic.
 */

export type CognitiveConcernCategory =
  | 'memory'
  | 'communication'
  | 'attention_planning'
  | 'daily_activities'
  | 'sleep_routine'
  | 'behavior_mood'
  | 'functional_other';

export type CognitiveConcernPerspective = 'patient' | 'caregiver';

export type CognitiveConcernStatus = 'ongoing' | 'occasional' | 'resolved';

export interface CognitiveConcern {
  id: string;
  patientId: string;
  recordedBy: string; // User ID
  recordedByName?: string;
  perspective: CognitiveConcernPerspective;
  category: CognitiveConcernCategory;
  description: string;
  contextNotes?: string;
  recordedAt: string; // ISO 8601
  status: CognitiveConcernStatus;
  /**
   * Product Owner Decision 3: Sharing control must be OFF by default (false).
   * Patient/Caregiver must explicitly consent before concern is included in doctor briefs.
   */
  sharedWithDoctor: boolean;
  hasAcuteIndicators?: boolean;
  acuteDisclaimerAcknowledged?: boolean;
}

export type ClinicalAssessmentType =
  | 'MMSE'
  | 'MoCA'
  | 'HMSE'
  | 'ACE-III'
  | 'CDR'
  | 'OTHER';

export interface ClinicalAssessmentAmendment {
  amendedAt: string; // ISO 8601
  amendedBy: string; // Doctor ID
  amendedByName: string;
  previousSummary: string;
  previousScore?: number;
  amendmentReason: string;
}

export interface ClinicalAssessmentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  assessmentName: ClinicalAssessmentType;
  customAssessmentName?: string;
  administrationDate: string; // YYYY-MM-DD
  language: string;
  totalScore?: number;
  maxScore?: number;
  scoreClassification?: string;
  qualitativeSummary: string;
  /**
   * Product Owner Decision 2: Strictly clinician-recorded externally administered formal tools.
   * Saksham never reproduces copyrighted assessment items or generates synthetic diagnostic scores.
   */
  administeredExternally: true;
  recordedAt: string; // ISO 8601
  amendments?: ClinicalAssessmentAmendment[];
}

export interface AcuteIndicatorCheckResult {
  hasAcuteWarning: boolean;
  matchedKeywords: string[];
  guidanceText: string;
  emergencyNumber: string;
  helplineNumber: string;
}

/**
 * SAKSHAM NEURO-CARE — PRIORITY 3
 * Doctor-Confirmed Diagnosis Pathways & Etiology Types
 *
 * Pathway A: Doctor-confirmed Alzheimer's Disease (NIA-AA Biomarker / Clinical Probable)
 * Pathway B: Doctor-confirmed Other or Mixed Dementia (VaD, DLB, FTD, PDD, Mixed, Unspecified)
 * Pending: Unassigned clinical evaluation pending
 *
 * Strictly clinician-controlled and verified.
 */
export type DementiaPathway =
  | 'alzheimers_confirmed'       // Pathway A: Doctor-confirmed Alzheimer's disease
  | 'other_or_mixed_dementia'     // Pathway B: Doctor-confirmed other/mixed dementia
  | 'unassigned_clinical_pending'; // Pending clinician evaluation

export type DementiaEtiology =
  | 'ALZHEIMERS_AMYLOID_CONFIRMED'  // Biomarker / PET amyloid confirmed
  | 'ALZHEIMERS_CLINICAL_PROBABLE'   // NIA-AA 2018 Clinical Probable AD
  | 'PARKINSONS_DISEASE'            // Parkinson's Disease (Motor predominant)
  | 'PARKINSONS_DEMENTIA'           // Parkinson's Disease Dementia (PDD)
  | 'VASCULAR_DEMENTIA'             // Subcortical Ischemic / Multi-Infarct
  | 'LEWY_BODY_DEMENTIA'            // Dementia with Lewy Bodies (DLB)
  | 'FRONTOTEMPORAL_DEMENTIA'       // FTD (Behavioral or Semantic variant)
  | 'MIXED_ETIOLOGY'                // Mixed AD + Vascular / Mixed Pathology
  | 'OTHER_NON_ALZHEIMERS'          // Other non-Alzheimer's neurological pathology
  | 'UNSPECIFIED_PENDING_EVALUATION';

export type ClinicalDementiaStage =
  | 'mild_cognitive_impairment'
  | 'mild_dementia'
  | 'moderate_dementia'
  | 'severe_dementia'
  | 'unspecified';

export interface ClinicalDiagnosisAmendment {
  amendedAt: string; // ISO 8601
  amendedByDoctorId: string;
  amendedByDoctorName: string;
  previousPathway: DementiaPathway;
  previousEtiology: DementiaEtiology;
  previousStage: ClinicalDementiaStage;
  amendmentReason: string;
}

export interface ClinicalDiagnosisRecord {
  id: string;
  patientId: string;
  confirmedByDoctorId: string;
  confirmedByDoctorName: string;
  doctorRegistrationNumber: string;
  pathway: DementiaPathway;
  etiology: DementiaEtiology;
  clinicalStage: ClinicalDementiaStage;
  isCurrent: boolean;
  diagnosticCriteria: string; // e.g. NIA-AA 2018, DSM-5, NINDS-AIREN
  clinicalRationale: string;
  confirmedAt: string; // ISO 8601
  amendedAt?: string;
  amendments?: ClinicalDiagnosisAmendment[];
}
